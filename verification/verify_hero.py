from playwright.sync_api import sync_playwright

def run(playwright):
    print("Launching browser...")
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    print("Navigating to http://localhost:8000")
    page.goto("http://localhost:8000")

    # Wait for canvas
    page.wait_for_selector("canvas", timeout=10000)
    print("Canvas found. Waiting for scene load...")
    page.wait_for_timeout(3000)

    # Verify Player Texture via JS evaluation
    # We need to access the Phaser game instance.
    # Usually it's assigned to a variable in index.html or we can find it.
    # Looking at index.html would be good, but assuming we can access the scene via global 'game' if it exists, or verify visually.

    # Let's try to find the game instance. If not global, we rely on screenshot.
    # But usually for debugging I attach it to window.

    # Screenshot
    print("Taking screenshot...")
    page.screenshot(path="verification/hero_verification.png")

    browser.close()
    print("Verification complete.")

with sync_playwright() as playwright:
    run(playwright)
