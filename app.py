import os
import json
from flask import Flask, render_template, request, jsonify, session, redirect, url_for, send_from_directory
from functools import wraps

# Set static_folder to None so we can handle static files manually and securely
app = Flask(__name__, template_folder='templates', static_folder=None)

# CONFIGURATION
app.secret_key = os.environ.get('SECRET_KEY', 'super_secret_key_default') # Secure for Render
DATA_DIR = os.path.join(os.getcwd(), 'data')
PASSWORD = "pingle2025"

# --- HELPERS ---
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

# --- PUBLIC ROUTES (The Main Website) ---

@app.route('/')
def home():
    # Serves your main portfolio page
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    # This acts as a file server for style.css, script.js, images/, etc.
    # SECURITY: Block access to python files and system files
    if filename.endswith('.py') or filename.endswith('.env') or filename == 'requirements.txt':
        return "Access Denied", 403
    return send_from_directory('.', filename)

# --- ADMIN ROUTES (The Hidden Panel) ---

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
    # Get list of JSON files
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
    files = [f for f in os.listdir(DATA_DIR) if f.endswith('.json')]
    return render_template('admin.html', view='dashboard', files=files)

# --- API ENDPOINTS ---

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
    # Local development
    if not os.path.exists('templates'):
        os.makedirs('templates')
    print("App running. Go to http://127.0.0.1:5000 for site, /admin for panel.")
    app.run(debug=True, port=5000)