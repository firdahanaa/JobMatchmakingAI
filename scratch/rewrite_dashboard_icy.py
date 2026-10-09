import re

file_path = r"c:\Users\rahil jade\JobMatchmakingAI\src\app\talent\dashboard\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add Navbar import if missing
if "import { Navbar }" not in content:
    content = content.replace(
        'import { FuturisticHeroDashboard }',
        'import { Navbar } from "@/components/navbar";\nimport { FuturisticHeroDashboard }'
    )

# 2. Main background and Navbar placement
content = content.replace(
    '<div className="min-h-screen flex flex-col bg-[#0B0F19] text-slate-100">',
    '<div className="min-h-screen flex flex-col bg-[#F0F9FF] text-[#0F172A]">\n      <Navbar />'
)

# 3. AI Ticker styling
content = content.replace(
    'border border-white/20 bg-white/10 backdrop-blur-xl px-5 py-3 shadow-xl',
    'border border-sky-100 bg-white px-5 py-3 shadow-md shadow-sky-100/50'
)
content = content.replace('text-white/90', 'text-[#0F172A]')
content = content.replace('text-white/30', 'text-slate-300')
content = content.replace('text-white/80', 'text-slate-600')
content = content.replace('from-indigo-500 to-violet-600', 'from-sky-500 to-blue-600')
content = content.replace('text-[#E0E081]', 'text-sky-600')
content = content.replace('bg-[#E0E081]', 'bg-sky-400')
content = content.replace('bg-[#E0E081]/20 border border-[#E0E081]/40 text-[#E0E081]', 'bg-sky-100 border border-sky-200 text-sky-700')

# 4. Quick Metrics cards (White cards, Sky shadows, Navy text)
content = content.replace(
    'border border-white/20 bg-white/10 p-6 backdrop-blur-xl shadow-xl transition-all duration-500 hover:-translate-y-1.5 hover:bg-white/15 hover:border-white/30 hover:shadow-2xl',
    'rounded-3xl border border-sky-100 bg-white p-6 shadow-md shadow-sky-100/50 hover:shadow-xl hover:shadow-sky-200/50 transition-all duration-300'
)
content = content.replace('text-white/60', 'text-slate-500')
content = content.replace('text-white/50', 'text-slate-400')
content = content.replace('text-white/90', 'text-[#0F172A]')
content = content.replace('text-white', 'text-[#0F172A]')
content = content.replace('bg-white/15', 'bg-sky-100')
content = content.replace('border border-white/20', 'border border-sky-200')

# 5. Rating card 3
content = content.replace(
    'rounded-3xl bg-[#0F172A]/90 border border-white/15 p-6 shadow-2xl backdrop-blur-xl',
    'rounded-3xl bg-white border border-sky-100 p-6 shadow-md shadow-sky-100/50 hover:shadow-xl hover:shadow-sky-200/50 transition-all duration-300'
)

# 6. Section headers & Card containers
content = content.replace(
    'border-white/10 bg-[#0F172A]/90 p-5 shadow-xl backdrop-blur-xl',
    'border border-sky-100 bg-white p-5 shadow-md shadow-sky-100/40 rounded-3xl'
)
content = content.replace(
    'border border-white/10 bg-[#0F172A]/90 p-5 sm:p-6 shadow-xl backdrop-blur-xl hover:border-indigo-500/40 hover:shadow-indigo-500/10',
    'border border-sky-100 bg-white p-5 sm:p-6 shadow-md shadow-sky-100/40 hover:border-sky-300 hover:shadow-xl hover:shadow-sky-200/50 transition-all duration-300 rounded-3xl'
)

# 7. Text colors
content = content.replace('text-slate-100', 'text-[#0F172A]')
content = content.replace('text-slate-200', 'text-[#0F172A]')
content = content.replace('text-slate-300', 'text-slate-600')
content = content.replace('text-slate-400', 'text-slate-500')
content = content.replace('text-indigo-400', 'text-sky-600')

# 8. Pill badges & tags
content = content.replace('bg-white/10', 'bg-sky-50')
content = content.replace('border-white/10', 'border-sky-100')
content = content.replace('border-white/15', 'border-sky-200')
content = content.replace('bg-indigo-500/10', 'bg-sky-100')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Dashboard transformed to Icy Blue!")
