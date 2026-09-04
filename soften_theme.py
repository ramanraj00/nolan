import os
import glob

# Files to process
files = glob.glob('frontend/components/dashboard/*.tsx') + ['frontend/app/dashboard/page.tsx']

for filepath in files:
    with open(filepath, 'r') as f:
        content = f.read()

    # Base page background
    content = content.replace('bg-[#000000]', 'bg-[#07080B]')
    
    # Card backgrounds
    content = content.replace('bg-[#09090B]', 'bg-[#111217]')
    
    # Soften borders slightly so they aren't completely invisible
    content = content.replace('border-zinc-800/60', 'border-white/10')
    content = content.replace('border-zinc-800/40', 'border-white/10')
    
    # Bump the muted text up slightly for better readability
    # Wait, the user said "zinc-400... Isse niche mat jao". But if readability is an issue,
    # maybe we change text-zinc-500 to text-zinc-400 where it exists?
    # I'll leave text colors alone for now, just fixing the background contrast is usually enough.

    with open(filepath, 'w') as f:
        f.write(content)

print("Theme softened successfully.")
