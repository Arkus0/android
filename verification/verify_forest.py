from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Navegar al juego
    page.goto("http://localhost:8000")

    # Esperar a que inicie la ForestScene (canvas está presente)
    page.wait_for_selector("canvas", timeout=10000)
    # Esperar tiempo extra para carga de imagen grande
    page.wait_for_timeout(3000)

    # 1. Screenshot Inicial (Fondo Chrono Trigger + Personaje)
    page.screenshot(path="verification/forest_screenshot.png")

    # 2. Intentar caminar hacia la izquierda (hacia el bosque denso, debería chocar)
    page.keyboard.down("ArrowLeft")
    page.wait_for_timeout(2000)
    page.keyboard.up("ArrowLeft")

    # 3. Screenshot colisión
    page.screenshot(path="verification/forest_collision_left.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
