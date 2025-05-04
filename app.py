# Ottoman Crime Network Map - Flask Application
from flask import Flask, render_template
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)

# Helper function to get Firebase config
def get_firebase_config():
    return {
        "apiKey": os.getenv("FIREBASE_API_KEY"),
        "authDomain": os.getenv("FIREBASE_AUTH_DOMAIN"),
        "projectId": os.getenv("FIREBASE_PROJECT_ID"),
        "storageBucket": os.getenv("FIREBASE_STORAGE_BUCKET"),
        "messagingSenderId": os.getenv("FIREBASE_MESSAGING_SENDER_ID"),
        "appId": os.getenv("FIREBASE_APP_ID")
    }

@app.route('/')
def one_page():
    """Render the new one-page application"""
    firebase_config = get_firebase_config()
    return render_template('index_new.html', firebase_config=firebase_config)

if __name__ == '__main__':
    app.run(debug=True, port=5004)