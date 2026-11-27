# Testing the Lab with a screen reader

Automated checks find many barriers but not all of them. This script lets one person test the Lab with a screen reader in about 30 minutes. Record what happened for each task in the table at the end, and open an issue for anything that fails.

## Before you start

Use one of these combinations, which are the most widely used:

| Screen reader | Browser | Starting it |
|---|---|---|
| NVDA (Windows, free from nvaccess.org) | Firefox or Chrome | Ctrl + Alt + N |
| VoiceOver (macOS, built in) | Safari | Cmd + F5 |
| VoiceOver (iPhone or iPad, built in) | Safari | Settings → Accessibility → VoiceOver |
| TalkBack (Android, built in) | Chrome | Settings → Accessibility → TalkBack |

Useful keys:

| Action | NVDA | VoiceOver on macOS |
|---|---|---|
| Next heading | H | VO + Cmd + H |
| List of headings, links and landmarks | NVDA + F7 | VO + U |
| Next form field | F | VO + Cmd + J |
| Read from here | NVDA + Down arrow | VO + A |
| Stop speech | Ctrl | Ctrl |

VO is Control + Option. Open the Lab at https://thefrankonuh.github.io/scholarly-prompt-lab/ and choose **Clear form** first, so you start from an empty design.

## Tasks

For each task, note whether you could complete it, whether what you heard made sense, and anything confusing.

1. **Find your way around.** Press Tab once. The first thing announced should be "Skip to the main content". Open the list of headings. You should hear the Lab's name, the section tabs and the title of the current tab.
2. **Change tab.** Move to the tabs (Build, Sensitivity study, Log & evaluate, Methods report, CONTEXT framework). Use the arrow keys to move between them. Each should be announced as a tab, with whether it is selected.
3. **Use the step rail.** In Build, move to the list of steps. Each step should be announced with its number, its name and whether it has answers. Choose step 3; the Lab should announce "Step 3 of 7" and its name.
4. **Choose a discipline.** Move to the Discipline field. It should be announced as a combo box. Type "hist", use the Down arrow to move through the suggestions, and press Enter to choose one.
5. **Choose a theory.** Under Theoretical orientation, find "Show the theory library" and open it. It should be announced as a button that is collapsed or expanded. Search for "postcolonial" and select a theory. It should appear among the selected theories with a "Remove" button.
6. **Copy the prompt.** Find "Copy prompt" and press it. You should hear a short confirmation.
7. **Score an output.** In Log & evaluate, go to the step "Evaluate the output". Each criterion should be announced with its name, followed by a group of options from 1 to 5. Choose a score with the arrow keys. A suggested score should be announced as "Suggested", and one you choose as "Your score" or "Confirmed".
8. **Read quotation results.** If you have logged an output with sources, find the quotation checks. Each result should be announced with its status (exact, near or not found) in words, not only as a colour.
9. **Read and edit the methods report.** In Methods report, choose "Rebuild the report from my records". Move into the preview. It should be announced as an editable text area, and you should be able to read it by heading.
10. **Manage projects.** Find "Manage projects" near the top and open it. You should be able to reach Rename, Duplicate, Back up and Delete for each project. Escape should close the panel.
11. **Privacy and installation.** In the footer, open "Privacy and data storage". It should be announced as a button that expands. Find "Install the Lab on this device".
12. **Teaching case.** In Build, open the Worked example menu and choose a teaching case. A new project should open, and the notice about teaching specimens should be readable near the top of Build.

## Record of results

| Task | Completed? | What was confusing or missing |
|---|---|---|
| 1. Find your way around | | |
| 2. Change tab | | |
| 3. Step rail | | |
| 4. Discipline | | |
| 5. Theory | | |
| 6. Copy the prompt | | |
| 7. Score an output | | |
| 8. Quotation results | | |
| 9. Methods report | | |
| 10. Manage projects | | |
| 11. Privacy and installation | | |
| 12. Teaching case | | |

Screen reader and version: ……  Browser and version: ……  Device: ……  Date: ……

Report problems at https://github.com/TheFrankOnuh/scholarly-prompt-lab/issues, naming the task, the screen reader and the browser.
