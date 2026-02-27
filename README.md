# SocialPlatform

A full-stack multi-container based social networking platform

## Project Structure

- **Frontend**: Built with React and uses bun (located in `/frontend`)
- **Backend**: API services as docker containers

## Getting Started

### Prerequisites
- Docker
- Docker Compose

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/mehdii000/SocialPlatform.git
   cd SocialPlatform
   ```

2. Environment Setup:
   Rename `.env.local` to `.env` and update the configuration variables as needed.

3. Build and Run the Application:
   ```bash
   docker-compose up --build
   ```

## Features
- User Authentication (Login/Signup) with JWT
- User Profiles
- Post Creation and Interaction
- Search Functionality
- Messaging system built with webockets
- Responsive UI/UX

## License
This project is licensed under the GNU General Public License v3.0.
