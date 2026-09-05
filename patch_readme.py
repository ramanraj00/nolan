with open('README.md', 'r') as f:
    content = f.read()

image_and_links = """
<p align="center">
  <img src="assets/hero.png" alt="Nolan Dashboard" width="100%" />
</p>

## 🚀 Live Links
- **Live Demo (Frontend):** [Insert your Vercel URL here]
- **Backend API:** [https://nolan-5pb9.onrender.com](https://nolan-5pb9.onrender.com)
"""

# Insert right before "<p align="center">\n  <a href="#-architecture">"
if '<a href="#-architecture">' in content:
    content = content.replace(
        '<p align="center">\n  <a href="#-architecture">',
        image_and_links + '\n<p align="center">\n  <a href="#-architecture">'
    )
else:
    # Fallback if not exactly matching
    content = image_and_links + content

with open('README.md', 'w') as f:
    f.write(content)
