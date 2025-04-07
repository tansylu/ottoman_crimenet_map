from flask import Flask, render_template, jsonify, send_from_directory
from dotenv import load_dotenv
import os

# Initialize Flask app
app = Flask(__name__, static_folder='static', template_folder='templates')

# Sample crime data
SAMPLE_CRIMES = {
    "crime1": {
        "id": "crime1",
        "coordinates": [41.0082, 28.9784],  # Istanbul
        "title": "Palace Theft Case",
        "date": "March 15, 1850",
        "description": "Historical artifacts stolen from Topkapi Palace during the festival.",
        "related": ["crime2"],
        "type": "theft"
    },
    "crime2": {
        "id": "crime2",
        "coordinates": [41.0136, 28.9550],  # Near Hagia Sophia
        "title": "Bazaar Assault", 
        "date": "April 2, 1850",
        "description": "Merchant severely beaten after refusing to pay protection money.",
        "related": [],
        "type": "assault"
    }
}

@app.route('/')
def home():
    """Main map page"""
    return render_template('map.html')

@app.route('/crime-details/<crime_id>')
def crime_details(crime_id):
    """Endpoint for crime details popup"""
    crime = SAMPLE_CRIMES.get(crime_id, {
        "title": "Unknown Case",
        "date": "Date unknown",
        "description": "No details available for this case.",
        "related": []
    })
    return render_template('crime-details.html', crime=crime)

@app.route('/get-crimes')
def get_crimes():
    """API endpoint for all crime locations"""
    return jsonify(list(SAMPLE_CRIMES.values()))

@app.route('/static/<path:path>')
def serve_static(path):
    """Serve static files"""
    return send_from_directory('static', path)

if __name__ == '__main__':
    app.run(debug=True, port=5000)