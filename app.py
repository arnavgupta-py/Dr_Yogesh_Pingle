import os
import json
from flask import Flask, render_template, request, jsonify, session, redirect, url_for, send_from_directory
from functools import wraps

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'static', 'data')

app.secret_key = os.environ.get('SECRET_KEY', 'super_secret_key_default') 
PASSWORD = "pingle2025"

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'logged_in' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def load_json(filename):
    filepath = os.path.join(DATA_DIR, filename)
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_json(filename, data):
    filepath = os.path.join(DATA_DIR, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        if request.form['password'] == PASSWORD:
            session['logged_in'] = True
            return redirect(url_for('admin_dashboard'))
        else:
            error = 'Invalid Credentials.'
    return render_template('admin.html', view='login', error=error)

@app.route('/logout')
def logout():
    session.pop('logged_in', None)
    return redirect(url_for('login'))

@app.route('/admin')
@login_required
def admin_dashboard():
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
    files = [f for f in os.listdir(DATA_DIR) if f.endswith('.json')]
    return render_template('admin.html', view='dashboard', files=files)

@app.route('/api/get/<filename>')
@login_required
def get_data(filename):
    return jsonify(load_json(filename))

@app.route('/api/save/<filename>', methods=['POST'])
@login_required
def save_data(filename):
    data = request.json
    save_json(filename, data)
    return jsonify({"status": "success", "message": "File saved successfully!"})

if __name__ == '__main__':
    # Ensure templates folder exists for local dev
    template_path = os.path.join(BASE_DIR, 'templates')
    if not os.path.exists(template_path):
        os.makedirs(template_path)
        print(f"WARNING: 'templates' folder not found at {template_path}")

    print(f" Server running. serving files from: {BASE_DIR}")
    app.run(debug=True, port=5000)