from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello_world():
    return '<h1>Success!</h1><p>Your Flask app is running inside Docker.</p>'

if __name__ == '__main__':
    # host='0.0.0.0' is required to make the app accessible outside the container
    app.run(debug=True, host='0.0.0.0', port=5000)
