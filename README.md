# FraudGuard — GitHub Pages Website

A responsive fraud-risk dashboard made with **HTML, CSS, and JavaScript**. It runs entirely in the browser and can be hosted using GitHub Pages without a Python server.

## Files

- `index.html` — website layout
- `style.css` — responsive styling
- `script.js` — transaction scoring, results, metrics, and session history

## Publish using GitHub Pages

1. Create a repository on GitHub named `fraud-detection-website`.
2. Upload `index.html`, `style.css`, `script.js`, and `README.md` to the repository root (not inside another folder).
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select branch `main` and folder `/ (root)`, then click **Save**.
6. Wait for deployment. Your website URL will look like:
   `https://YOUR-USERNAME.github.io/fraud-detection-website/`

## Important limitations

- This is an educational interface using a transparent heuristic, not a trained machine-learning model.
- Scores are not calibrated probabilities of fraud and are not validated on real transactions.
- All activity is stored in the current page session and is cleared on reload.
- Do not enter real customer details, card numbers, PINs, passwords, OTPs, or other sensitive information.
- Do not use this demo to block payments or accuse customers of fraud.
