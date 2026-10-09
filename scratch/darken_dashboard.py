import re

file_path = r"c:\Users\rahil jade\JobMatchmakingAI\src\app\talent\dashboard\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Replace main wrapper background
content = content.replace(
    'style={{ background: "linear-gradient(to bottom, #2a1e15 0%, #36271c 280px, #4a3728 480px, #7a5a4a 680px, #c4967f 820px, #F7ECEA 960px)" }}',
    'className="min-h-screen flex flex-col bg-[#0B0F19] text-slate-100"'
)

# 2. Replace section headers background (squircle cards from white to dark glass)
content = content.replace(
    'border-[#e8d5d0] bg-white p-5 shadow-md',
    'border-white/10 bg-[#0F172A]/90 p-5 shadow-xl backdrop-blur-xl'
)

# 3. Replace text colors in headers
content = content.replace('text-[#4a3728]', 'text-white')
content = content.replace('text-[#8a7668]', 'text-slate-400')
content = content.replace('text-[#5c4639]', 'text-slate-300')
content = content.replace('text-[#7a6559]', 'text-slate-300')
content = content.replace('text-[#b87a65]', 'text-indigo-400')
content = content.replace('text-[#C98B75]', 'text-indigo-400')

# 4. Replace background pills & borders
content = content.replace('bg-[#F7ECEA]', 'bg-white/10')
content = content.replace('bg-[#F9F5DC]', 'bg-indigo-500/10')
content = content.replace('border-[#e8d5d0]', 'border-white/10')
content = content.replace('border-[#e0c4bc]', 'border-indigo-500/30')
content = content.replace('border-[#d4b0a5]', 'border-white/15')

# 5. Replace card containers
content = content.replace(
    'border border-[#e8d5d0] bg-white p-5 sm:p-6 shadow-md',
    'border border-white/10 bg-[#0F172A]/90 p-5 sm:p-6 shadow-xl backdrop-blur-xl hover:border-indigo-500/40 hover:shadow-indigo-500/10'
)

content = content.replace(
    'border border-[#e8d5d0] bg-white p-5 shadow-md',
    'border border-white/10 bg-[#0F172A]/90 p-5 shadow-xl backdrop-blur-xl hover:border-indigo-500/40'
)

# 6. Rating card (Card 3 in metrics)
content = content.replace(
    'rounded-3xl bg-white p-6 shadow-2xl',
    'rounded-3xl bg-[#0F172A]/90 border border-white/15 p-6 shadow-2xl backdrop-blur-xl'
)

# 7. Button hover colors
content = content.replace('hover:bg-[#C98B75]', 'hover:bg-indigo-600')
content = content.replace('from-[#C98B75] to-[#D4B980]', 'from-indigo-500 to-violet-600')
content = content.replace('from-[#4a3728] to-[#36271c]', 'from-[#0B0F19] to-[#0F172A]')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Dashboard darkened successfully!")
