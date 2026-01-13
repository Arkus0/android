from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Navegar al juego
    page.goto("http://localhost:8000")

    # Esperar a que el canvas exista (indicador de que Phaser inyectó el juego)
    page.wait_for_selector("canvas", timeout=10000)

    # Esperar un poco más para que la escena Boot cargue y pase a BattleScene
    # Como los assets son generados proceduralmente, debería ser rápido, pero damos margen
    page.wait_for_timeout(3000)

    # Verificar que existen elementos de texto en el canvas no es directo con selectores DOM,
    # porque Phaser dibuja en Canvas.
    # Sin embargo, mi código de UI en UIScene usa objetos Text de Phaser, que NO son DOM elements.
    # Pero el contenedor #game-container sí existe.

    # Tomar screenshot
    page.screenshot(path="verification/game_screenshot.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
