# Restore the detailed Wimbledon and Queen's court views

## What the investigation found
- The detailed Queen's view in your third screenshot (Andy Murray Arena, Court 1, Courts 2–10, Practice viewing, Day/Pause buttons, "Official grounds map" link, streets and buildings from OpenStreetMap) is not in this project. Nothing in the project or the copy brought over from GitHub has those names. The GitHub copy only had the simple version (Centre Court, Outer courts, Practice courts), which is what you see now.
- So that detailed version was probably built later, in Codex or on your Mac, and never pushed to GitHub. The project shows a network error in GitHub Desktop and 21 uncommitted changes. That fits.
- Double-click: at the moment, clicking a club on the London icons map only selects it. You have to press "Explore the courts" to open the court view. Double-click currently only resets the camera inside the court view.

## Plan
1. Restore exactly, if you can provide it (best option): push your local Mac folder to GitHub once the connection works, or upload a ZIP of `src` and `public`. I will compare it file by file and bring over only the detailed Wimbledon/Queen's court view and its data, plus the double-click behaviour. Racquet, guide, booking and player-card work stays as it is.
2. If the files can't be found, rebuild to match the screenshot:
   - Real street, building and court outlines around both clubs from OpenStreetMap, saved in the project. This uses the same approach as the existing Highbury backdrop, and the OpenStreetMap credit stays visible as their licence requires.
   - Real court names and stops. Queen's: Andy Murray Arena, Court 1, Courts 2–10, Practice viewing. Wimbledon: Centre Court, No. 1 Court, plus the main outer courts, each checked against the club's official grounds map.
   - Day/night toggle and Pause, the "Official grounds map" link and the updated disclaimer.
3. Double-click a club on the London icons map to open its court view straight away. A single click still selects it.
4. Add a test for the double-click path and the court stop names, and check both venues on desktop and mobile.

## Status
You've pushed your local version, but the repository is still private, so GitHub won't let me open it. Once it's public, step 1 replaces step 2. I'll check the repository again first when work starts.
