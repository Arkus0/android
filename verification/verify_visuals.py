from playwright.sync_api import sync_playwright
import time

def verify(page):
    print("Navigating to game...")
    page.goto("http://localhost:8000/index.html")
    page.wait_for_selector("canvas", timeout=10000)

    print("Waiting for BootScene and VillageScene...")
    time.sleep(5)

    # Check if game object is available
    is_game_ready = page.evaluate("!!window.game")
    if not is_game_ready:
        print("Game object not found on window.")
        return

    # 1. Village Screenshot
    print("Taking Village screenshot...")
    page.screenshot(path="verification/village.png")

    # 2. Switch to ForestScene
    print("Switching to ForestScene...")
    # Note: scene.start stops current and starts new.
    page.evaluate("window.game.scene.scenes[0].scene.start('ForestScene')")
    # Accessing via scene manager might be safer: game.scene.getScene('VillageScene').scene.start...
    # Or just game.scene.start('ForestScene') doesn't exist directly on game instance usually?
    # Phaser Game instance has scene manager.
    # game.scene.start('ForestScene') works if 'game.scene' is the SceneManager? No, game.scene is SceneManager.
    # But usually scenes are stopped/started via active scene reference or global manager.
    # let's try window.game.scene.start('ForestScene')

    # Wait for transition
    time.sleep(2)
    print("Taking Forest screenshot...")
    page.screenshot(path="verification/forest.png")

    # 3. Switch to BattleScene
    print("Switching to BattleScene...")
    page.evaluate("window.game.scene.start('BattleScene')")
    time.sleep(2)
    print("Taking Battle screenshot...")
    page.screenshot(path="verification/battle.png")

    # 4. Switch to HouseScene (requires data)
    print("Switching to HouseScene...")
    page.evaluate("window.game.scene.start('HouseScene', { houseId: 'house_small' })")
    time.sleep(2)
    print("Taking House screenshot...")
    page.screenshot(path="verification/house.png")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    try:
        verify(page)
    except Exception as e:
        print(f"Error: {e}")
    finally:
        browser.close()
