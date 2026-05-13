// Seed data generator for SocialPlatform.
// Usage: AUTH_DB_URL=... RESONANCE_DB_URL=... go run ./cmd/seed
// Creates 50 users, 300 posts, likes, comments, follows, topics, and interests.

package main

import (
	"context"
	"fmt"
	"math/rand"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	authURL := os.Getenv("AUTH_DB_URL")
	socialURL := os.Getenv("RESONANCE_DB_URL")
	if authURL == "" || socialURL == "" {
		fmt.Println("AUTH_DB_URL and RESONANCE_DB_URL must be set")
		os.Exit(1)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	authPool, err := pgxpool.New(ctx, authURL)
	fatalIf("connect auth_db", err)
	defer authPool.Close()

	socialPool, err := pgxpool.New(ctx, socialURL)
	fatalIf("connect social_db", err)
	defer socialPool.Close()

	// Check idempotency
	var userCount int
	socialPool.QueryRow(ctx, `SELECT COUNT(*) FROM profiles`).Scan(&userCount)
	if userCount > 10 {
		fmt.Printf("%d users already exist. Skipping seed.\n", userCount)
		return
	}

	rng := rand.New(rand.NewSource(time.Now().UnixNano()))

	fmt.Println("Seeding database...")

	// Phase 1: Users
	usernames := generateUsernames(50)
	userIDs := make([]uuid.UUID, 50)
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)

	for i, uname := range usernames {
		uid := uuid.New()
		userIDs[i] = uid

		// Insert into auth_db.users
		_, err := authPool.Exec(ctx,
			`INSERT INTO users (id, username, email, password_hash, created_at)
			 VALUES ($1, $2, $3, $4, NOW())
			 ON CONFLICT DO NOTHING`,
			uid, uname, uname+"@example.com", string(hashedPassword))
		fatalIf("insert auth user", err)

		// Insert into social_db.profiles
		_, err = socialPool.Exec(ctx,
			`INSERT INTO profiles (user_id, username, display_name, bio, created_at, updated_at)
			 VALUES ($1, $2, $3, $4, NOW(), NOW())
			 ON CONFLICT DO NOTHING`,
			uid, uname, uname+"_display", "Bio for "+uname)
		fatalIf("insert profile", err)
	}
	fmt.Printf("  Created %d users\n", len(userIDs))

	// Phase 2: Follows
	followCount := 0
	for _, followerID := range userIDs {
		numFollowing := rng.Intn(15) + 2
		shuffled := make([]uuid.UUID, len(userIDs))
		copy(shuffled, userIDs)
		rng.Shuffle(len(shuffled), func(i, j int) { shuffled[i], shuffled[j] = shuffled[j], shuffled[i] })
		for _, followeeID := range shuffled[:numFollowing] {
			if followerID == followeeID {
				continue
			}
			_, err := socialPool.Exec(ctx,
				`INSERT INTO follows (follower_id, followee_id, created_at)
				 VALUES ($1, $2, NOW())
				 ON CONFLICT DO NOTHING`,
				followerID, followeeID)
			if err == nil {
				followCount++
			}
		}
	}
	fmt.Printf("  Created %d follow relationships\n", followCount)

	// Phase 3: Posts (300 posts with topic-specific content)
	postIDs := make([]uuid.UUID, 300)
	postUsers := make([]uuid.UUID, 300)
	postContents := make([]string, 300)
	postTimestamps := make([]time.Time, 300)

	for i := 0; i < 300; i++ {
		pid := uuid.New()
		postIDs[i] = pid
		postUsers[i] = userIDs[rng.Intn(50)]
		daysAgo := rng.Intn(30)
		hoursAgo := rng.Intn(24)
		ts := time.Now().Add(-time.Duration(daysAgo)*24*time.Hour - time.Duration(hoursAgo)*time.Hour - time.Duration(rng.Intn(60))*time.Minute)
		postTimestamps[i] = ts

		// Pick 1-3 random topics and use their templates
		numTopics := rng.Intn(3) + 1
		content := ""
		usedSlugs := map[string]bool{}
		for j := 0; j < numTopics; j++ {
			slug := topicSlugs[rng.Intn(len(topicSlugs))]
			if usedSlugs[slug] {
				continue
			}
			usedSlugs[slug] = true
			sentences := topicSentences[slug]
			if len(sentences) > 0 {
				if content != "" {
					content += " "
				}
				content += sentences[rng.Intn(len(sentences))]
			}
		}
		if content == "" {
			content = "Just sharing some thoughts today."
		}
		postContents[i] = content

		_, err := socialPool.Exec(ctx,
			`INSERT INTO posts (id, author_id, content, media_type, created_at)
			 VALUES ($1, $2, $3, 0, $4)`,
			pid, postUsers[i], content, ts)
		fatalIf("insert post", err)
	}
	fmt.Printf("  Created %d posts\n", len(postIDs))

	// Phase 4: Topics — assign topics to posts by keyword matching
	topicIDs := loadTopicIDs(ctx, socialPool)
	totalTopicAssignments := 0
	interestCounts := map[string]map[uuid.UUID]float64{} // userID -> topicID -> total delta

	for i := 0; i < 300; i++ {
		matched := matchTopics(postContents[i], topicIDs)
		for _, m := range matched {
			_, err := socialPool.Exec(ctx,
				`INSERT INTO post_topics (post_id, topic_id, relevance, is_auto)
				 VALUES ($1, $2, $3, TRUE)
				 ON CONFLICT (post_id, topic_id) DO NOTHING`,
				postIDs[i], m.topicID, m.relevance)
			if err == nil {
				totalTopicAssignments++
				// Increment post count
				socialPool.Exec(ctx, `UPDATE topics SET post_count = post_count + 1 WHERE id = $1`, m.topicID)
			}
		}
	}
	fmt.Printf("  Created %d post-topic assignments\n", totalTopicAssignments)

	// Phase 5: Likes (~1500)
	likeCount := 0
	for _, pid := range postIDs {
		numLikes := rng.Intn(15) + 1
		shuffled := make([]uuid.UUID, len(userIDs))
		copy(shuffled, userIDs)
		rng.Shuffle(len(shuffled), func(i, j int) { shuffled[i], shuffled[j] = shuffled[j], shuffled[i] })
		for _, uid := range shuffled[:numLikes] {
			_, err := socialPool.Exec(ctx,
				`INSERT INTO likes (user_id, post_id, created_at)
				 VALUES ($1, $2, NOW() - INTERVAL '1 day' * $3)
				 ON CONFLICT DO NOTHING`,
				uid, pid, rng.Intn(30))
			if err == nil {
				likeCount++
				if interestCounts[uid.String()] == nil {
					interestCounts[uid.String()] = map[uuid.UUID]float64{}
				}
				// Track interest from likes
				tags, _ := getPostTopics(ctx, socialPool, pid)
				for _, t := range tags {
					interestCounts[uid.String()][t] += 0.1
				}
			}
		}
	}
	fmt.Printf("  Created %d likes\n", likeCount)

	// Phase 6: Comments (~400)
	commentCount := 0
	commentTemplates := []string{
		"Great post!", "I totally agree", "This is really interesting",
		"Thanks for sharing!", "Love this perspective", "Well said!",
		"Couldn't agree more", "This made my day", "Very insightful",
		"Nice one!", "Absolutely!", "Spot on!", "Brilliant take",
		"So true", "This resonates with me", "Quality content right here",
	}
	for i := 0; i < 400; i++ {
		pid := postIDs[rng.Intn(300)]
		uid := userIDs[rng.Intn(50)]
		content := commentTemplates[rng.Intn(len(commentTemplates))]
		_, err := socialPool.Exec(ctx,
			`INSERT INTO comments (id, post_id, author_id, content, created_at)
			 VALUES ($1, $2, $3, $4, NOW() - INTERVAL '1 day' * $5)`,
			uuid.New(), pid, uid, content, rng.Intn(30))
		if err == nil {
			commentCount++
			if interestCounts[uid.String()] == nil {
				interestCounts[uid.String()] = map[uuid.UUID]float64{}
			}
			tags, _ := getPostTopics(ctx, socialPool, pid)
			for _, t := range tags {
				interestCounts[uid.String()][t] += 0.15
			}
		}
	}
	fmt.Printf("  Created %d comments\n", commentCount)

	// Phase 7: User interests (from aggregated likes/comments)
	interestInsertCount := 0
	for uidStr, topicWeights := range interestCounts {
		uid, _ := uuid.Parse(uidStr)
		for tid, weight := range topicWeights {
			if weight > 5.0 {
				weight = 5.0
			}
			_, err := socialPool.Exec(ctx,
				`INSERT INTO user_interests (user_id, topic_id, weight, last_engaged_at)
				 VALUES ($1, $2, $3, NOW() - INTERVAL '1 day' * $4)
				 ON CONFLICT (user_id, topic_id)
				 DO UPDATE SET weight = LEAST(5.0, user_interests.weight + $3)`,
				uid, tid, weight, rng.Intn(7))
			if err == nil {
				interestInsertCount++
			}
		}
	}
	fmt.Printf("  Created %d user interest records\n", interestInsertCount)

	// Update likes_count and comments_count on posts
	_, err = socialPool.Exec(ctx, `
		UPDATE posts SET
			likes_count = (SELECT COUNT(*) FROM likes WHERE post_id = posts.id),
			comments_count = (SELECT COUNT(*) FROM comments WHERE post_id = posts.id)`)
	fatalIf("update post counts", err)

	fmt.Println("Seed complete.")
}

func fatalIf(msg string, err error) {
	if err != nil {
		fmt.Fprintf(os.Stderr, "%s: %v\n", msg, err)
		os.Exit(1)
	}
}

type topicMatch struct {
	topicID   uuid.UUID
	relevance float64
}

func matchTopics(content string, topicIDs map[string]uuid.UUID) []topicMatch {
	contentLower := toLower(content)
	matches := []topicMatch{}
	for slug, tid := range topicIDs {
		if slug == "general" {
			continue
		}
		name := topicNames[slug]
		if containsWord(contentLower, slug) || containsWord(contentLower, name) {
			matches = append(matches, topicMatch{tid, 0.9})
		}
	}
	if len(matches) == 0 {
		if genID, ok := topicIDs["general"]; ok {
			matches = append(matches, topicMatch{genID, 0.1})
		}
	}
	return matches
}

func containsWord(text, word string) bool {
	// Simple substring match — good enough for seed data
	for i := 0; i <= len(text)-len(word); i++ {
		if text[i:i+len(word)] == word {
			return true
		}
	}
	return false
}

func toLower(s string) string {
	b := make([]byte, len(s))
	for i := range s {
		c := s[i]
		if c >= 'A' && c <= 'Z' {
			c += 32
		}
		b[i] = c
	}
	return string(b)
}

func loadTopicIDs(ctx context.Context, pool *pgxpool.Pool) map[string]uuid.UUID {
	rows, err := pool.Query(ctx, `SELECT id, slug FROM topics`)
	if err != nil {
		return map[string]uuid.UUID{}
	}
	defer rows.Close()
	m := map[string]uuid.UUID{}
	for rows.Next() {
		var id uuid.UUID
		var slug string
		rows.Scan(&id, &slug)
		m[slug] = id
	}
	return m
}

func getPostTopics(ctx context.Context, pool *pgxpool.Pool, postID uuid.UUID) ([]uuid.UUID, error) {
	rows, err := pool.Query(ctx, `SELECT topic_id FROM post_topics WHERE post_id = $1`, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	ids := []uuid.UUID{}
	for rows.Next() {
		var id uuid.UUID
		rows.Scan(&id)
		ids = append(ids, id)
	}
	return ids, nil
}

var topicSlugs = []string{
	"technology", "programming", "webdev", "mobile", "ai", "gaming",
	"design", "ux", "art", "photography", "filmmaking", "music",
	"science", "space", "nature", "animals", "food", "travel",
	"fashion", "fitness", "sports", "basketball", "football",
	"books", "writing", "poetry", "philosophy", "humor", "memes",
	"business", "startup",
}

var topicNames = map[string]string{
	"technology": "technology", "programming": "programming", "webdev": "web dev",
	"mobile": "mobile", "ai": "ai", "gaming": "gaming", "design": "design",
	"ux": "ux", "art": "art", "photography": "photography", "filmmaking": "filmmaking",
	"music": "music", "science": "science", "space": "space", "nature": "nature",
	"animals": "animals", "food": "food", "travel": "travel", "fashion": "fashion",
	"fitness": "fitness", "sports": "sports", "basketball": "basketball",
	"football": "football", "books": "books", "writing": "writing",
	"poetry": "poetry", "philosophy": "philosophy", "humor": "humor",
	"memes": "memes", "business": "business", "startup": "startup",
}

var topicSentences = map[string][]string{
	"technology": {
		"Just got my hands on the latest tech gadget and it's absolutely mind-blowing how far technology has come.",
		"Technology is evolving faster than ever. AI chips, quantum computing, and edge devices are reshaping everything.",
		"The intersection of technology and daily life continues to amaze me. Smart homes are no longer science fiction.",
	},
	"programming": {
		"Spent the weekend refactoring a legacy codebase. Clean code and good programming practices make such a difference.",
		"Programming in Go has been a breath of fresh air. The simplicity and performance are unmatched.",
		"Hot take: functional programming paradigms are underrated in mainstream software development.",
	},
	"webdev": {
		"Just deployed a new web app using React and Go. Modern web dev tooling has come so far.",
		"CSS Grid and container queries have completely changed how I approach web dev layouts.",
		"Web dev in 2026 is wild. Server components, edge rendering, and instant navigation everywhere.",
	},
	"mobile": {
		"The new mobile app update brings some much-needed performance improvements to the table.",
		"Mobile development with cross-platform frameworks keeps getting better. The gap with native is shrinking.",
		"My mobile screen time report came in and I think I need to touch grass.",
	},
	"ai": {
		"AI and machine learning are transforming every industry. The pace of innovation in AI is staggering.",
		"Just experimented with a new AI model for image generation and the results are incredibly realistic.",
		"AI ethics is something we need to talk about more. With great power comes great responsibility.",
	},
	"gaming": {
		"This new gaming update completely changes the meta. Time to relearn everything.",
		"Gaming with friends this weekend was epic. Nothing beats a good co-op gaming session.",
		"Indie gaming is where the real innovation happens. AAA studios are playing it too safe.",
	},
	"design": {
		"Minimalist design principles can transform any interface. Less is always more in design.",
		"Just finished a design system overhaul. Consistent spacing, typography, and color tokens make everything better.",
		"The best design is invisible. When users don't notice the design, you've done your job right.",
	},
	"ux": {
		"UX research reveals users prefer simplicity over feature-rich interfaces. Shocking nobody.",
		"The UX of this app is so good I didn't even need a tutorial. That's the gold standard of UX.",
		"Accessibility is UX. If your UX doesn't work for everyone, it doesn't work.",
	},
	"art": {
		"Visited a contemporary art gallery today. Some incredible art pieces that challenge perception.",
		"Digital art is evolving so fast. The line between traditional art and digital art is blurring.",
		"Creating art every day keeps my creative muscles strong. Even quick sketches count.",
	},
	"photography": {
		"Golden hour photography hits different. The lighting was perfect for some street photography today.",
		"Film photography is making a comeback and I'm here for it. There's something magical about analog.",
		"Photography tip: the best camera is the one you have with you. Composition beats equipment every time.",
	},
	"filmmaking": {
		"Just watched a masterclass in filmmaking. The cinematography and storytelling were next level.",
		"Independent filmmaking is thriving thanks to accessible equipment and distribution platforms.",
		"Filmmaking is storytelling with light. Every frame should serve the narrative.",
	},
	"music": {
		"Discovered this new album and I can't stop listening. Music discovery is one of life's great joys.",
		"Learning to play music has been one of the most rewarding experiences. Music theory is fascinating.",
		"Live music hits different. The energy of a crowd singing along is something you can't replicate.",
	},
	"science": {
		"Science breakthroughs this year have been incredible. From CRISPR to fusion energy, science delivers.",
		"The scientific method is still the best tool we have for understanding reality. Trust science.",
		"Popular science books make complex topics accessible to everyone. Knowledge should be democratized.",
	},
	"space": {
		"Space exploration is entering a new golden age. The images from the latest space telescope are breathtaking.",
		"Thinking about the scale of the universe makes all my problems feel tiny. Space is humbling.",
		"Space X just launched another mission and the space community is buzzing with excitement.",
	},
	"nature": {
		"Spent the morning hiking and reconnecting with nature. There's something healing about being in nature.",
		"Nature photography from my weekend camping trip. The wildlife and nature scenery were stunning.",
		"We need to protect our natural spaces. Nature conservation isn't optional, it's essential.",
	},
	"animals": {
		"My rescue cat did the funniest thing today. Animals bring so much joy to our lives.",
		"Wildlife conservation efforts are showing results. Endangered animals are making a comeback in some regions.",
		"Animals are smarter than we give them credit for. The more we study animals, the more we learn.",
	},
	"food": {
		"Tried a new recipe tonight and it turned out amazing. Cooking good food is such a satisfying hobby.",
		"Food is the universal language. Exploring different cuisines and food cultures is like traveling without leaving home.",
		"Homemade food beats takeout every time. The secret ingredient is always love and good food preparation.",
	},
	"travel": {
		"Just booked my next travel adventure. There's nothing quite like the excitement of planning travel.",
		"Travel opens your mind in ways nothing else can. Every travel experience teaches you something new.",
		"Solo travel tip: talk to locals. They know the best spots that no travel guide mentions.",
	},
	"fashion": {
		"Sustainable fashion is the future. Fast fashion needs to die, ethical fashion is the way forward.",
		"Thrifted this amazing vintage jacket. Pre-loved fashion is better for the planet and your wallet.",
		"Fashion is self-expression. Wear what makes you feel confident and ignore the fashion rules.",
	},
	"fitness": {
		"Just hit a new personal record at the gym. Consistency in fitness truly pays off over time.",
		"Fitness isn't about looking good, it's about feeling good. Mental health and fitness go hand in hand.",
		"Home fitness setup is finally complete. No more excuses to skip fitness training days.",
	},
	"sports": {
		"What a game last night! Sports have a way of bringing people together like nothing else.",
		"The sports season has been incredible so far. Every match feels like a championship game.",
		"Youth sports need better funding. Investing in grassroots sports benefits everyone in the long run.",
	},
	"basketball": {
		"Played pickup basketball with friends today. Nothing beats the flow state of a good basketball game.",
		"The basketball playoffs are delivering this year. Every basketball game has been must-watch TV.",
		"Basketball strategy is so much deeper than people realize. It's chess at high speed.",
	},
	"football": {
		"The football transfer window is going to be wild this summer. Football clubs are spending big.",
		"Weekend football with the lads is the highlight of my week. Grassroots football is where the passion lives.",
		"Football tactics have evolved so much in the last decade. Modern football is a different game entirely.",
	},
	"books": {
		"Just finished reading an incredible book. Good books have a way of staying with you long after the last page.",
		"My reading goal for this year is ambitious but achievable. Books are the best investment you can make.",
		"The feel of physical books is irreplaceable. E-readers are convenient but books have soul.",
	},
	"writing": {
		"Writing every day, even just a few hundred words, has improved my thinking so much.",
		"The writing process is messy but beautiful. First drafts are supposed to be rough, that's what writing is.",
		"Creative writing workshops are amazing for getting feedback. Other writers see what you miss in your writing.",
	},
	"poetry": {
		"Discovered Rumi's poetry and my mind is blown. Centuries old poetry still hits different today.",
		"Wrote some poetry about the seasons changing. Poetry helps me process emotions I can't otherwise express.",
		"Poetry slams are such a powerful art form. Spoken word poetry brings words to life in a unique way.",
	},
	"philosophy": {
		"Reading some Stoic philosophy lately. Ancient philosophy has so much practical wisdom for modern life.",
		"Philosophy isn't just abstract thinking. Applied philosophy helps us navigate ethical dilemmas every day.",
		"The philosophy of mind is fascinating. Consciousness and philosophy of self are the final frontiers.",
	},
	"humor": {
		"My attempt at baking was a complete disaster but at least my humor about it is getting better.",
		"Dad jokes are the highest form of humor and I will defend this hill with my life.",
		"Dark humor is like food. Not everyone gets it, but those who do appreciate good humor.",
	},
	"memes": {
		"Found this meme that perfectly describes Monday mornings. Internet memes are modern art, change my mind.",
		"The meme economy is strong today. Quality memes are being produced at an unprecedented rate.",
		"Memes have become a legitimate form of communication. We speak in memes now and I'm okay with it.",
	},
	"business": {
		"The business landscape is shifting rapidly. Adaptability is the most valuable business skill right now.",
		"Small business owners are the backbone of the economy. Support local business whenever you can.",
		"Business ethics matter more than ever. Consumers are voting with their wallets for ethical business practices.",
	},
	"startup": {
		"Working on a startup idea that solves a real problem. The startup journey is tough but exhilarating.",
		"Startup culture has its flaws but the innovation coming from startups is undeniable.",
		"My startup just hit a major milestone. Building a startup from zero is the hardest and best thing ever.",
	},
}

func generateUsernames(count int) []string {
	adjectives := []string{
		"swift", "bright", "cosmic", "silent", "bold", "calm", "keen", "wild",
		"zen", "neon", "cyber", "pixel", "frost", "storm", "dusk", "dawn",
		"void", "flux", "apex", "nova", "sage", "lunar", "solar", "echo",
		"ember", "coral", "jade", "onyx", "opal", "ruby", "wisp", "zinc",
	}
	nouns := []string{
		"fox", "owl", "wolf", "hawk", "bear", "lynx", "deer", "crow",
		"panda", "koala", "tiger", "eagle", "shark", "raven", "otter", "phoenix",
		"falcon", "dragon", "cobra", "jaguar", "viper", "falcon", "orca", "leopard",
	}
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	seen := map[string]bool{}
	result := make([]string, 0, count)
	for len(result) < count {
		adj := adjectives[rng.Intn(len(adjectives))]
		noun := nouns[rng.Intn(len(nouns))]
		num := rng.Intn(999)
		name := fmt.Sprintf("%s_%s%d", adj, noun, num)
		if !seen[name] {
			seen[name] = true
			result = append(result, name)
		}
	}
	return result
}
