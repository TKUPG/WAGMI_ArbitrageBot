from flask import Flask, request, jsonify
from market_analysis import analyze_market

app = Flask(__name__)

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.json
    token = data.get("token", "ETH")
    news = data.get("news", "No news provided")
    result = analyze_market(token, news)
    return jsonify(result)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)