import os
import re

files_to_update = [
    r"c:\Users\rahil jade\JobMatchmakingAI\src\app\talent\projects\page.tsx",
    r"c:\Users\rahil jade\JobMatchmakingAI\src\components\talent\project-card.tsx",
    r"c:\Users\rahil jade\JobMatchmakingAI\src\components\talent\project-filter-bar.tsx",
    r"c:\Users\rahil jade\JobMatchmakingAI\src\app\talent\applications\page.tsx",
    r"c:\Users\rahil jade\JobMatchmakingAI\src\components\talent\applications-list.tsx",
    r"c:\Users\rahil jade\JobMatchmakingAI\src\app\talent\profile\page.tsx",
    r"c:\Users\rahil jade\JobMatchmakingAI\src\components\talent\portfolio-input.tsx",
    r"c:\Users\rahil jade\JobMatchmakingAI\src\components\talent\skill-selector.tsx"
]

for file_path in files_to_update:
    if not os.path.exists(file_path):
        continue

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Main background
    content = content.replace('bg-[#F7ECEA]', 'bg-[#0B0F19] text-slate-100')
    content = content.replace('bg-[#f8fafc]', 'bg-[#0F172A]/90 text-slate-100 border-white/10')
    content = content.replace('bg-[#F9F5DC]', 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20')

    # 2. Banners & Cards
    content = content.replace('bg-gradient-to-r from-[#b87a65] via-[#C98B75] to-[#b89e5e]', 'bg-gradient-to-r from-indigo-900 via-[#0F172A] to-violet-950 border border-indigo-500/30')
    content = content.replace('bg-white', 'bg-[#0F172A]/90 text-slate-100 border-white/10')
    content = content.replace('border-[#e8d5d0]', 'border-white/10')
    content = content.replace('border-[#d4b0a5]', 'border-white/15')
    content = content.replace('border-[#e0c4bc]', 'border-indigo-500/30')

    # 3. Text colors
    content = content.replace('text-[#4a3728]', 'text-white')
    content = content.replace('text-[#5c4639]', 'text-slate-200')
    content = content.replace('text-[#695449]', 'text-slate-300')
    content = content.replace('text-[#7a6559]', 'text-slate-300')
    content = content.replace('text-[#8a7668]', 'text-slate-400')
    content = content.replace('text-[#a89080]', 'text-slate-400')
    content = content.replace('text-[#b87a65]', 'text-indigo-400')
    content = content.replace('text-[#C98B75]', 'text-indigo-400')

    # 4. Buttons
    content = content.replace('bg-[#C98B75]', 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white')
    content = content.replace('hover:bg-[#b87a65]', 'hover:from-indigo-600 hover:to-violet-700')

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"Updated {os.path.basename(file_path)}")
