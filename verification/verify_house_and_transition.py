from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Navegar al juego
    page.goto("http://localhost:8000")

    # Esperar a que inicie la HouseScene (canvas está presente)
    page.wait_for_selector("canvas", timeout=10000)
    page.wait_for_timeout(2000) # Carga de assets y escena

    # 1. Screenshot de la Casa
    page.screenshot(path="verification/house_screenshot.png")

    # 2. Mover el personaje hacia la salida (Abajo)
    # Simular tecla flecha abajo por 3 segundos
    page.keyboard.down("ArrowDown")
    page.wait_for_timeout(3000)
    page.keyboard.up("ArrowDown")

    # Esperar transición (FadeOut + BattleScene init)
    page.wait_for_timeout(2000)

    # 3. Screenshot de la Batalla (Confirmar transición)
    page.screenshot(path="verification/battle_transition_screenshot.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
