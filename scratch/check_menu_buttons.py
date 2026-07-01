import os
import re

dirs = ['二上', '三上', '四上', '四下', '五上', '五下', '六上', '六下', '七上']
workspace = r'd:\夢N數位協力\Gemini數位教具'

html_files = []
for d in dirs:
    dir_path = os.path.join(workspace, d)
    if os.path.exists(dir_path):
        for root, _, files in os.walk(dir_path):
            for f in files:
                if f.endswith('.html'):
                    html_files.append(os.path.join(root, f))

report = []
report.append(f"Analyzing {len(html_files)} files...")

for file_path in html_files:
    rel_path = os.path.relpath(file_path, workspace)
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        report.append(f"Error reading {rel_path}: {e}")
        continue
    
    # Let's find all divs/sections that act as screens
    screens = re.findall(r'id=["\']([a-zA-Z0-9_-]*(?:screen|container|page|panel|lobby|menu))["\']', content, re.IGNORECASE)
    screens = list(set(screens))
    
    # Filter for screens that are start/home/menu/setup and game/play/battle
    start_screens = [s for s in screens if any(x in s.lower() for x in ['start', 'home', 'menu', 'setup', 'lobby'])]
    game_screens = [s for s in screens if any(x in s.lower() for x in ['game', 'play', 'battle', 'challenge'])]
    
    if start_screens and game_screens:
        transitions_back = False
        for start_s in start_screens:
            patterns = [
                rf'showScreen\s*\(\s*[\'"]{start_s}[\'"]\s*\)',
                rf'classList\.remove\s*\(\s*[\'"]hidden[\'"]\s*\).*{start_s}',
                rf'{start_s}.*classList\.remove\s*\(\s*[\'"]hidden[\'"]\s*\)',
                rf'{start_s}.*style\.display\s*=\s*[\'"](block|flex|grid)[\'"]',
                rf'style\.display\s*=\s*[\'"](block|flex|grid)[\'"].*{start_s}',
                rf'resetToMain', rf'restartSetup', rf'goHome', rf'backToMenu', rf'returnToMenu',
                rf'id=["\']btn-home["\']', rf'id=["\']btn-back["\']'
            ]
            for pat in patterns:
                if re.search(pat, content):
                    transitions_back = True
                    break
            if transitions_back:
                break
        
        game_markup = ""
        for g_s in game_screens:
            match = re.search(rf'id=["\']{g_s}["\']', content)
            if match:
                idx = match.start()
                game_markup += content[idx:idx+8000]
        
        has_back_button = False
        back_button_patterns = [
            r'回首頁', r'回主選單', r'回到主畫面', r'回選單', r'🏠', r'↩️', r'arrow-left',
            r'btn-home', r'btn-back', r'home-btn', r'goHome', r'restartSetup', r'resetToMain',
            r'btnHome', r'btnPvpHome'
        ]
        for pat in back_button_patterns:
            if re.search(pat, game_markup):
                has_back_button = True
                break
                
        if not has_back_button or not transitions_back:
            report.append(f"⚠️ MISSING: {rel_path} (Start screens: {start_screens}, Game screens: {game_screens})")
        else:
            report.append(f"✅ OK: {rel_path}")

with open(os.path.join(workspace, 'scratch', 'missing_buttons_report2.txt'), 'w', encoding='utf-8') as f:
    f.write("\n".join(report))

print("Done! Check scratch/missing_buttons_report2.txt")
