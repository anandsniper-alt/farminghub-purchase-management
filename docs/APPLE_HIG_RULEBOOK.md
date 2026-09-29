# Apple Human Interface Guidelines Rulebook

A practical handbook for designing and reviewing apps across Apple platforms

Research edition 29 September 2026

Use this handbook to turn Apple's Human Interface Guidelines into concrete design decisions and review evidence. It covers the common design foundations, everyday components and tasks, six platforms, input methods, and system surfaces. Numbered rules are concise paraphrases of the linked Apple guidance.

This is an independent synthesis, not an Apple publication or a verbatim copy. The complete official HIG remains the authority for exceptions and specialized features. The final directory routes to the wider library; those linked chapters are not all reproduced here. App Store review rules, API availability, entitlements, and licensing require their own checks.

Read the shared chapters, then the chapter for each target platform. Apply the feature chapters that match the product. Practical checks and the review workflow are suggested team methods, not additional Apple requirements. Treat point values as Apple interface units; do not transfer them directly to CSS pixels or physical pixels.

Apple guidance: [Official Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/); [App Store guidelines overview](https://developer.apple.com/app-store/guidelines/)

## Using this rulebook across projects

This file is self-contained. Copy `APPLE_HIG_RULEBOOK.md` into each project's documentation folder or attach it to the project's reference materials. It does not require the PDF, the original conversation, or any local assets. Internet access is only needed to open the official source links.

When adopting it in a project:

1. Identify the target platforms and relevant features. Apply the shared rules plus the applicable platform and feature chapters.
2. Reference the numbered rule IDs in design decisions, implementation notes, and reviews.
3. Treat this file as design guidance within the project's approved scope. It does not authorize redesigns, changes to business rules, or replacement of established project requirements.
4. Keep project-specific decisions and exceptions in the project's own documentation, including the reason and applicable rule IDs.
5. Recheck the linked Apple guidance when the supported operating systems or system components change. This edition records research from 29 September 2026.

Suggested project instruction:

> Use APPLE_HIG_RULEBOOK.md as a design reference for UI work. Apply the rules relevant to this project's platforms and features, preserve approved workflows and business behavior, and document any justified exceptions with their rule IDs.

For websites and other platforms, follow the adaptation guidance in Chapter 6; Apple-specific measurements and interactions require platform-appropriate treatment.

## Contents

- [1 Design foundations](#1-design-foundations)
- [2 Navigation components and tasks](#2-navigation-components-and-tasks)
- [3 Files sharing media and AI](#3-files-sharing-media-and-ai)
- [4 Platform rules](#4-platform-rules)
- [5 Input and system surfaces](#5-input-and-system-surfaces)
- [6 Practical review workflow](#6-practical-review-workflow)
- [7 Complete topic routing directory](#7-complete-topic-routing-directory)

## 1 Design foundations

Choose readable, adaptive visual treatments and familiar behavior before polishing individual screens.

### Design principles

**R001** Start with a clear purpose: identify the outcomes people value, then concentrate effort on the features that deliver them.

**R002** Preserve agency with understandable feedback, freedom to explore, ways to leave guided flows, and recovery from mistakes.

**R003** Earn trust through transparent behavior, careful treatment of information, and proportionate data collection.

**R004** Build on familiar concepts and keep established appearances and interactions consistent.

**R005** Design for diverse abilities, contexts, devices, and input methods; retain people's context when the interface adapts.

**R006** Make every element useful. Simplicity means sufficient clarity and information, rather than removing everything.

**R007** Treat visual quality, responsiveness, wording, and real-world reliability as part of craft. Iterate after release.

**R008** Choose an emotional character appropriate to the product; delight should support the central task.

Application note: Apple's June 8, 2026 principles are Purpose, Agency, Responsibility, Familiarity, Flexibility, Simplicity, Craft, and Delight. They guide judgment rather than prescribing one solution.

Practical check: For each major feature, name its user outcome and demonstrate recovery from a common mistake.

Apple guidance: [Design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles)

### Accessibility

**R009** Design for accessibility from the beginning. Inspect the implementation with Accessibility Inspector.

**R010** Label controls for VoiceOver and Voice Control; support Switch Control and relevant Assistive Access behavior. Offer alternatives to gesture-only core actions.

**R011** Support readable larger text, adequately sized controls, and enough separation to reduce accidental activation.

**R012** Convey essential information beyond color or sound. Provide captions and descriptions where needed; avoid important content that dismisses too quickly.

**R013** Measure foreground/background contrast and test light and dark appearances. If default contrast falls short, Apple asks for a higher-contrast scheme with Increase Contrast.

**R014** Use the qualified platform tables below; default and minimum sizes are different concepts.

Practical check: Complete the primary task with VoiceOver, enlarged text, and audio muted; record any lost action or information.

Apple guidance: [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)

#### Recommended control sizes in current Accessibility HIG

| Platform | Default control size (pt) | Minimum control size (pt) |
| --- | --- | --- |
| iOS, iPadOS | 44 x 44 | 28 x 28 |
| macOS | 28 x 28 | 20 x 20 |
| tvOS | 66 x 66 | 56 x 56 |
| visionOS | 60 x 60 | 28 x 28 |
| watchOS | 44 x 44 | 28 x 28 |

Use defaults as the normal design starting point. Adequate spacing and platform-specific interaction guidance still matter.

### Inclusion and localization

**R015** Investigate people's actual goals and perspectives instead of assuming everyone shares your education, culture, family structure, resources, or physical abilities.

**R016** Use respectful, direct language and explain necessary specialist terms. Avoid culture-dependent idioms and humor that becomes confusing or tiring.

**R017** Represent varied people and circumstances without assigning stereotyped roles. Let people customize representations when appropriate.

**R018** Do not collect gender information unless the experience needs it; where needed, consider inclusive answers and a way to decline.

**R019** Prepare for different languages and regional date, time, number, and currency formats. Review color meanings across supported cultures.

**R020** Include permanent, temporary, and situational disabilities in design decisions.

Application note: An experience can avoid offensive content and still exclude people; inclusion is a continuing design process.

Practical check: Review onboarding, forms, illustrations, and sample data with people outside the design team's usual perspective.

Apple guidance: [Inclusion](https://developer.apple.com/design/human-interface-guidelines/inclusion)

### Layout and adaptation

**R021** Place high-priority content where people begin reading. Use alignment, indentation, grouping, and deliberate spacing to reveal relationships.

**R022** Introduce detail progressively when showing everything initially would hide important content or choices.

**R023** Keep controls visibly distinct from content. On supported platforms, adopt system layering, scroll-edge treatments, and backgrounds that extend beneath navigation.

**R024** Respond to available space, safe areas, margins, text changes, localization, and window resizing. In iOS and iPadOS, use size classes rather than treating device model or orientation as a layout rule.

**R025** Let rows grow and adjacent items stack when text needs room. Preserve an understandable hierarchy through these changes.

**R026** Scale artwork without distorting its aspect ratio.

Application note: Current Layout guidance was updated September 9, 2026. Fixed orientation does not remove the need to adapt to different window sizes.

Practical check: Inspect smallest and largest supported windows, long translations, right-to-left layout, and the largest supported text size.

Apple guidance: [Layout](https://developer.apple.com/design/human-interface-guidelines/layout)

### Typography

**R027** Prefer system text styles to obtain coherent size, weight, spacing, and hierarchy. Access system fonts through platform APIs rather than bundling them.

**R028** Use a small, purposeful selection of typefaces. Favor readable weights and increase size when a thin custom face becomes difficult to read.

**R029** Support Dynamic Type where available, including custom-font scaling and Bold Text behavior.

**R030** Keep useful content visible as text grows: allow additional lines, reduce columns, stack secondary information, and scale meaningful icons.

**R031** Maintain relative hierarchy at every size and minimize truncation, especially in scrollable content.

**R032** Test actual reading distances and conditions; numeric minima are starting guidance, not proof that a font is readable.

Application note: Dynamic Type availability is platform-specific. Apple's Typography page states that macOS does not support Dynamic Type.

Practical check: Verify body text and key actions at default and largest accessibility sizes on real target devices.

Apple guidance: [Typography](https://developer.apple.com/design/human-interface-guidelines/typography)

#### Recommended text sizes

| Platform | Default text size (pt) | Minimum text size (pt) |
| --- | --- | --- |
| iOS, iPadOS | 17 | 11 |
| macOS | 13 | 10 |
| tvOS | 29 | 23 |
| visionOS | 17 | 12 |
| watchOS | 16 | 12 |

These are platform recommendations for system and custom fonts. Thin faces may need larger text; preserve scaling and real-world legibility.

### Color

**R033** Choose semantic system colors for their intended purpose; do not copy fixed RGB values or repurpose a separator color as text.

**R034** Assign consistent meanings to colors. An accent used for an interactive action should not also imply that ordinary text is interactive.

**R035** Provide custom-color variants for light, dark, and increased-contrast appearances.

**R036** Use labels, shapes, or symbols alongside color to convey state and data differences.

**R037** Keep colorful content and translucent controls legible together, including their resting positions and scrolling transitions.

**R038** Use accent color selectively on controls. With visually rich backgrounds, monochromatic navigation or a clearly differentiated accent can improve readability.

**R039** Embed image color profiles and check appearance across relevant display gamuts.

Application note: System color values can change between OS releases. Treat published swatches as design references, not implementation constants.

Practical check: Inspect each semantic color in light, dark, increased-contrast, and visually busy background conditions.

Apple guidance: [Color](https://developer.apple.com/design/human-interface-guidelines/color)

### Materials and Liquid Glass

**R040** Use Liquid Glass to distinguish navigation and controls above content; use standard materials to organize the content layer.

**R041** Rely on system components to adopt the material appropriately. Add custom glass sparingly and only where it improves important functional elements.

**R042** Prefer regular Liquid Glass when background variability or substantial text makes legibility demanding.

**R043** Reserve clear Liquid Glass for controls over visually rich media. For bright underlying content, Apple suggests considering a dark dimming layer at 35% opacity; avoid duplicating dimming already supplied by AVKit.

**R044** Choose standard material styles by their semantic purpose, not an incidental color appearance.

**R045** Use system vibrant foreground colors and inspect the result when transparency or contrast settings change.

Application note: An activated control within content can be an exception. visionOS has its own adaptive glass and no distinct Dark Mode setting.

Practical check: Scroll bright and dark media behind every custom glass control; verify legibility with Reduce Transparency and Increase Contrast.

Apple guidance: [Materials](https://developer.apple.com/design/human-interface-guidelines/materials)

### Dark Mode

**R046** Respect the system appearance preference and support changes while the app remains open. Apple generally discourages an additional app-specific appearance switch.

**R047** Use adaptive semantic colors; a dark palette is not simply an inversion of the light palette.

**R048** Inspect imagery, interface icons, labels, and custom controls in both appearances. Supply alternative assets where one image fails to remain clear.

**R049** Use system backgrounds and text views so elevated surfaces and text rendering preserve the system's hierarchy.

**R050** Test Increase Contrast and Reduce Transparency independently and together.

**R051** Reserve a permanently dark interface for an appropriate exceptional context, such as immersive media viewing.

**R052** For custom foreground/background combinations, the Dark Mode page encourages stronger contrast, especially for small text.

Application note: The Dark Mode HIG says the setting is unsupported on visionOS and watchOS. Its color guidance specifies at least 4.5:1 and a 7:1 aspiration for custom colors, especially small text.

Practical check: Switch appearance during an open modal and inspect foreground separation, images, and text before and after the change.

Apple guidance: [Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode)

### Interface icons and SF Symbols

**R053** Use an established symbol when it expresses the intended object or action; align its optical weight and scale with nearby text.

**R054** Choose rendering modes deliberately: monochrome, hierarchy, palette, or multicolor. Check small details against the actual background.

**R055** Let system containers choose familiar outline or filled variants where appropriate; reserve variable color for changing quantities or states.

**R056** Use symbol animation to communicate a specific event or activity, with restraint.

**R057** If a custom symbol is needed, follow the supplied template's detail, alignment, weight, and perspective, and provide an accessibility description.

**R058** Verify symbol and feature availability against the oldest supported OS.

**R059** Observe SF Symbols usage restrictions: symbols are not app icons, logos, or trademarks; some Apple-related symbols cannot be modified.

Application note: SF Symbols licensing and individual-symbol restrictions remain authoritative; this design summary does not replace their terms.

Practical check: Review every unlabeled icon for clear meaning, accessible naming, supported OS availability, and legibility at its smallest size.

Apple guidance: [SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols)

### Motion

**R060** Give animation a clear communication purpose, such as showing a state change, feedback, or the relationship between views.

**R061** Prefer system motion, which adapts to context and accessibility settings. Match custom transitions to the direction and cause of the person's action.

**R062** Keep feedback brief and precise, particularly for frequent interactions.

**R063** Allow interruption or cancellation where possible; animation should not unnecessarily delay the next action.

**R064** Provide another way to understand important information, and make motion optional for people who cannot comfortably experience it.

**R065** In spatial experiences, minimize peripheral motion and large moving objects that can make surroundings appear to move.

**R066** Choose performance defaults appropriate to each supported device.

Application note: Do not turn a suggested game frame-rate range into a universal animation duration or performance guarantee.

Practical check: Repeat a frequent task with Reduce Motion enabled and during rapid input; verify useful feedback and no unnecessary waiting.

Apple guidance: [Motion](https://developer.apple.com/design/human-interface-guidelines/motion)

### Writing and labels

**R067** Decide what each screen must communicate and place its most important information first.

**R068** Write action labels that describe what happens, usually with a clear verb. Descriptive link text is more useful than a generic click instruction.

**R069** Use consistent terms for the same concept and consistent labels through multistep processes.

**R070** Make the start, next step, and completion of a flow understandable.

**R071** Apply capitalization patterns consistently while honoring guidance for the particular component.

**R072** Adapt length and emphasis to the device and context; small personal screens demand concise text.

**R073** Prefer plain, inclusive wording, and express what people can do instead of filling the interface with prohibitions.

Application note: Consistency does not require identical text on every platform; wording should suit the available space and interaction context.

Practical check: Read actions and links without surrounding paragraphs; their purpose should still be understandable.

Apple guidance: [Writing](https://developer.apple.com/design/human-interface-guidelines/writing)

### App icons

**R074** Build a simple, distinctive central idea that communicates the app's identity at a glance and remains recognizable at small sizes.

**R075** Keep the overall identity consistent across platforms while following each platform's icon shape and behavior.

**R076** Provide unmasked source layers with the appropriate square or rectangular shape; the system applies the final mask and visual effects.

**R077** Center important artwork so masking and motion do not crop it. Use Apple's production templates and Icon Composer where applicable.

**R078** Prefer clear illustration to detailed photography or screenshots. Include text only when essential.

**R079** Check every supported appearance variant and alternate icon.

**R080** Do not reproduce Apple hardware in your app icon.

Application note: Exact canvas sizes, appearance variants, and production requirements vary by platform; consult the current App icons specifications before export.

Practical check: Inspect the icon at small system sizes in every required appearance; confirm its main idea survives masking and motion.

Apple guidance: [App icons](https://developer.apple.com/design/human-interface-guidelines/app-icons)

### Brand identity

**R081** Express the brand through its voice, imagery, accent color, and carefully chosen typography. Keep content and tasks prominent.

**R082** Retain familiar control meanings and locations. A distinctive visual identity still needs predictable interactions.

**R083** Use custom type only when it stays readable at small sizes and accommodates accessibility settings. Avoid repeatedly consuming useful space with a logo.

**R084** Keep the transient launch screen focused on visual continuity. Introduce brand storytelling in an appropriate welcome experience.

Practical check: Review a screen with the logo hidden. Its purpose, actions, and brand voice should remain understandable.

Apple guidance: [Branding](https://developer.apple.com/design/human-interface-guidelines/branding)

## 2 Navigation components and tasks

Select each component by its role in the task, then apply the relevant platform behavior.

### Navigation tabs and sidebars

**R085** Use tabs for top-level destinations and toolbars for actions on the current view. Preserve each tab's navigation state. Keep destinations stable: an empty section should explain its state instead of disappearing or becoming disabled.

**R086** Keep tab labels short and meaningful. Prefer familiar scalable symbols. Limit navigation complexity and avoid placing important destinations behind a More overflow tab. Badges should signal information that genuinely warrants attention.

**R087** A sidebar suits larger windows and deeper collections. Group long hierarchies with disclosure controls; allow customization or hiding where useful. On iPad, consider tabs first and an adaptable sidebar when more destinations are needed. In visionOS, a sidebar inside a tab supports secondary navigation without changing the active tab.

Application note: Tab position and behavior vary by platform; do not turn the familiar iPhone bottom bar into a universal placement rule.

Practical check: Switch tabs after opening a detail item; confirm the return location remains understandable. Resize through supported widths and verify every destination remains reachable.

Apple guidance: [Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars); [Sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars)

### Toolbars and location

**R088** Use toolbars to provide familiar access to navigation, the current view or document title, useful actions, and search. Give windows meaningful content-related titles; the app name rarely explains the current location.

**R089** Use the standard Back and Close controls with their expected meanings: Back retraces a hierarchy, while Close dismisses a modal context. Current HIG prefers the standard symbols rather than custom text labels saying Back or Close.

**R090** Respect standard toolbar regions. The leading area contains navigation and sidebar controls; the central area can contain common tools; the trailing area can contain actions and search. Let adaptive system behavior handle shrinking space, including supported overflow and customization.

Application note: Follow the current platform component rather than copying fixed positions from an older screenshot.

Practical check: Confirm that every toolbar action acts on the content users expect and that compact windows retain essential navigation. Compare dismissal and backward navigation separately.

Apple guidance: [Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars)

### Search and filtering

**R091** Keep the recognizable search icon, editable field, clear action, and informative placeholder. Make the searched content or scope clear. Prefer responsive results as people type; offer recent or predicted terms when they reduce effort.

**R092** Rank useful results first and group results when that aids scanning. Scope controls and editable tokens can narrow clearly defined categories; begin broadly when appropriate and let people refine.

**R093** Choose placement by purpose. On iPhone, search can live in a tab, toolbar, or inline with the content it filters. On iPad and Mac, toolbar search works well across split-view content, sidebar search can filter navigation, and a dedicated destination supports discovery.

Application note: A dedicated search page and a transient search button serve different needs; there is no single mandatory placement.

Practical check: Test empty, loading, no-match, and filtered results. Verify that clearing a query and leaving search return people to an understandable state.

Apple guidance: [Search fields](https://developer.apple.com/design/human-interface-guidelines/search-fields)

### Buttons and action hierarchy

**R094** A button performs an immediate action. Prefer system styles because they supply familiar interaction states, accessibility, and appearance adaptation. Make every custom button visibly respond when pressed.

**R095** Use clear labels or familiar symbols that communicate the outcome. A short action phrase is better than an obscure icon. Use visual prominence to distinguish the primary option among equally sized related buttons; reserve strong emphasis for one or two actions in a view.

**R096** For buttons, Apple recommends a hit region of at least 44 x 44 points, or 60 x 60 points in visionOS. The hit region can exceed the visible icon. Apply component-specific guidance alongside the general control-size table.

Application note: The smaller general accessibility minima do not replace the button-specific recommendation.

Practical check: Activate each control with the platform's supported inputs and assistive technology. Inspect pressed, disabled, selected, and focused states where applicable.

Apple guidance: [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons)

### Menus and contextual actions

**R097** Label commands clearly, usually with short action phrases. An ellipsis means that additional information or choices are needed before the command completes. Group related options and keep submenus shallow.

**R098** Ordinary menus should communicate unavailable commands with a disabled state while remaining openable. Context menus follow a different rule: show a short, relevant set of currently useful actions and generally hide unavailable items; macOS Cut, Copy, and Paste are exceptions.

**R099** Provide context-menu commands elsewhere in the main interface, since the menu is hidden until invoked. Keep this behavior consistent across comparable objects. In supported touch and spatial interfaces, identify destructive contextual commands appropriately and place them at the end.

Application note: Do not apply context-menu visibility rules to ordinary menus indiscriminately.

Practical check: Check enabled and disabled selections separately. Verify that a new user can find every important action without knowing the context-menu gesture.

Apple guidance: [Menus](https://developer.apple.com/design/human-interface-guidelines/menus); [Context menus](https://developer.apple.com/design/human-interface-guidelines/context-menus)

### Forms selection and data entry

**R100** Ask only for information the task needs. Reuse available system information with appropriate permission, provide sensible defaults, and explain what belongs in each field. Offer choices instead of typing when the possible values are known.

**R101** Use secure entry for secrets, and system authentication or password tools where appropriate. Never fill a password field with an invented or stored default. Support paste and drag-and-drop where useful.

**R102** Validate values during entry and describe corrections promptly. Apply suitable number and locale formatting. Make required input and progression requirements clear. A pop-up button suits a flat, mutually exclusive selection; use other controls for actions, multiple selection, or nested choices.

Application note: The choice of picker, text field, toggle, slider, or stepper depends on the data and platform; one control does not fit every form.

Practical check: Test blank, invalid, pasted, long, and locale-specific values. Confirm corrections preserve other entries and that labels remain understandable after placeholder text disappears.

Apple guidance: [Entering data](https://developer.apple.com/design/human-interface-guidelines/entering-data); [Pop-up buttons](https://developer.apple.com/design/human-interface-guidelines/pop-up-buttons)

### Toggles and selection controls

**R103** Use a toggle for two opposing states. On macOS, radio buttons express one choice from a set; checkboxes allow independent choices.

**R104** Make the current value understandable without relying on color alone. Label the setting clearly enough that its enabled and disabled meanings are predictable.

Application note: Control appearance and availability vary by platform. Use the native form that matches the selection model.

Practical check: Inspect every setting in both states. Confirm a single-choice group cannot represent contradictory selections.

Apple guidance: [Toggles](https://developer.apple.com/design/human-interface-guidelines/toggles)

### Sheets and focused tasks

**R105** Use a sheet for a scoped task related to the current context, such as composing, supplying details, or choosing a save location. Keep the relationship to the parent view understandable.

**R106** Distinguish cancellation, completion, and backward navigation. Cancel or Close abandons the sheet as designed; Done completes or saves; Back moves within a multistep flow and does not dismiss the sheet.

**R107** On iPhone and iPad, use the platform's expected toolbar placement and dismissal behavior. A resizable sheet needs a grabber, and unsaved changes need appropriate protection when someone swipes to dismiss. Use a medium height only when it supports useful progressive disclosure; some tasks need full height.

Application note: iOS and iPadOS sheets can be modal or nonmodal. Apple describes sheets on macOS, tvOS, visionOS, and watchOS as modal.

Practical check: Test Done, Cancel, Back, swipe dismissal, keyboard appearance, and every supported sheet size with both changed and unchanged content.

Apple guidance: [Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets)

### Popovers and temporary controls

**R108** Use a popover for a small amount of information or a few related temporary controls. Anchor it clearly to its source without covering that source or essential context.

**R109** Show only one popover at a time. Do not build cascades of popovers or cover one with another view except an alert. Keep its size proportionate to the task and animate size changes smoothly.

**R110** A nonmodal popover may close when people interact outside it; preserve their work on automatic dismissal. Discard edits only after an explicit Cancel. Keep a multiple-selection popover open until selection is complete or people dismiss it. Use a Close or Done control when it clarifies the outcome.

Application note: Prefer a full-screen modal presentation in compact iOS or iPadOS views. Popovers are not supported in tvOS or watchOS.

Practical check: Click outside after making a change; confirm that work is preserved. Test source anchoring and readable placement near every window edge.

Apple guidance: [Popovers](https://developer.apple.com/design/human-interface-guidelines/popovers)

### Alerts errors and consequential choices

**R111** Reserve alerts for critical information people need immediately, ideally with an actionable response. Routine status belongs in context. Avoid startup alerts and repeated confirmation of common actions people can undo.

**R112** Explain the actual situation with a brief, specific title and only the necessary supporting text. Use a direct, neutral tone; vague error codes or accusatory wording do not help people recover.

**R113** Match the interface to the decision. In iOS and iPadOS, an action sheet offers alternatives related to an action people deliberately initiated; an alert communicates a critical condition or confirms a consequential action. Keep the number of choices and the text short enough to scan.

Application note: An error does not automatically justify a modal alert; its urgency, context, and recovery options matter.

Practical check: For each interruption, identify the immediate decision it enables. Verify the safest dismissal path, destructive labeling, and behavior at large text sizes.

Apple guidance: [Alerts](https://developer.apple.com/design/human-interface-guidelines/alerts)

### Feedback and loading

**R114** Match feedback to significance. Keep routine status near the affected content; interrupt for critical, actionable problems or unexpected irreversible loss. Confirm important successful transactions without celebrating every ordinary tap.

**R115** Make feedback available through more than one appropriate channel so color, sound, or haptics alone never carry essential meaning. Preserve accessibility when the device is silent or the person uses VoiceOver.

**R116** Prefer determinate progress when measurement is possible. Report advancement honestly, explain stalled work, and remove indicators when processing finishes. Change an indeterminate bar to a determinate bar when duration becomes known, without abruptly changing spinner and bar styles. Offer Cancel or Pause when feasible.

Application note: For watchOS, Apple advises against indeterminate waiting indicators; reassure people about completion notification instead.

Practical check: Simulate slow, stalled, failed, and completed operations. Confirm people can tell what happened without sound and cannot accidentally submit the same transaction twice.

Apple guidance: [Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback); [Progress indicators](https://developer.apple.com/design/human-interface-guidelines/progress-indicators)

### Undo and redo

**R117** Support recovery so people can experiment confidently. Describe the operation an undo or redo will affect, using meaningful labels where the platform permits them.

**R118** Make the result visible, including when it affects content that has scrolled out of view. Avoid arbitrary limits on repeated undo. Group closely related adjustments when one reversal better matches the person's intent.

**R119** Preserve standard gestures and keyboard shortcuts. macOS places these commands at the top of Edit and uses Command-Z and Shift-Command-Z. Add dedicated toolbar buttons only when they improve access; use the standard symbols.

Application note: Apple lists undo and redo as unsupported in tvOS and watchOS; design platform-appropriate correction flows where needed.

Practical check: Perform several different edits, reverse them repeatedly, then redo them. Confirm that the indicated action, visible result, and stored data agree at every step.

Apple guidance: [Undo and redo](https://developer.apple.com/design/human-interface-guidelines/undo-and-redo)

### Onboarding and contextual learning

**R120** Make the core experience understandable through use. When onboarding is needed, keep it brief, engaging, and optional where possible. Start it after launch completes rather than making it part of launch.

**R121** Teach actions interactively, or give focused tips alongside the relevant control. Avoid requiring people to memorize many instructions before they can begin. Teach the app's distinctive behavior instead of explaining basic system operation.

**R122** Respect a skipped tutorial and keep it available later. Postpone nonessential configuration, ratings, and purchase requests until people have experienced value. Request private-data access when its feature becomes relevant, except when that access is genuinely necessary to begin.

Practical check: Run first launch, skipped onboarding, subsequent launch, and tutorial replay. Verify a person can reach a meaningful outcome without waiting for optional downloads or configuration.

Apple guidance: [Onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding)

### Settings and defaults

**R123** Choose defaults that serve most people well and minimize the number of settings. Detect available device features and system preferences instead of asking people to re-enter information the app already knows.

**R124** Put infrequent, general preferences in settings. Place choices that affect a specific task within that task, so people can adjust them without leaving their work.

**R125** Respect systemwide accessibility, appearance, and input preferences. Avoid redundant app controls that imply these system choices do not apply. Expose settings through platform conventions; with a physical keyboard, Command-Comma is a familiar route. On Mac, keep settings navigation stable and restore the previously visited pane.

Application note: watchOS apps do not add custom preferences to the system Settings app; expose a small set of essential options in the app.

Practical check: Try the app using defaults, then change relevant system preferences. Verify settings names describe their effect and task-specific options are available at the point of use.

Apple guidance: [Settings](https://developer.apple.com/design/human-interface-guidelines/settings)

### Privacy and permission requests

**R126** Request only the data or capability needed for a feature, at a moment when its purpose is clear. Explain the concrete use in a short, complete purpose statement and respect the person's choice.

**R127** Prefer on-device processing where practical and adopt system security mechanisms. Use protected credential storage and established authentication features; do not put passwords or other secrets in plaintext files.

**R128** If an explanatory screen must precede a protected-resource system prompt, use one neutral Continue or Next button that opens the prompt. Do not label that button Allow, imitate the permission dialog, or visually steer the person toward consenting. Keep privacy disclosures accurate and understandable.

Application note: The single-button guidance applies specifically to custom screens before protected-resource system alerts, not to every optional feature introduction.

Practical check: Test allowed, denied, limited, and later-revoked access where supported. Verify the app explains unavailable functionality without falsely suggesting consent has already been granted.

Apple guidance: [Privacy](https://developer.apple.com/design/human-interface-guidelines/privacy)

### Account creation authentication and deletion

**R129** Require an account only when core functionality needs one and explain the reason. Make available authentication methods clear.

**R130** If the app supports account creation, provide a clear in-app route to initiate account deletion. Explain timing and any information that must be retained.

**R131** Distinguish deleting an account from cancelling a subscription so people understand what each action changes.

Practical check: Try account creation, sign-in recovery, and account deletion. Confirm the person can predict what happens to access, stored content, and subscriptions.

Apple guidance: [Managing accounts](https://developer.apple.com/design/human-interface-guidelines/managing-accounts)

### Notifications and attention

**R132** Send concise, timely information worth the interruption and obtain the necessary permission. Avoid repeated notifications for the same event and keep sensitive personal content out of exposed previews.

**R133** When people are already using the app, integrate updates unobtrusively into the relevant view. Provide useful notification actions when a task can be completed directly. Do not use remote notifications as error dialogs.

**R134** Assign urgency honestly. Time Sensitive is for information relevant now, not marketing; Critical delivery requires Apple's entitlement. Promotional notifications require explicit opt-in and an in-app way to change the choice. Respect Focus and delivery preferences instead of attempting to evade them.

Application note: Actual delivery depends on system settings and permissions; never promise an interruption the app cannot guarantee.

Practical check: Inspect delivery with the app open, closed, and the device locked. Test duplicate suppression, opt-out, routing to the relevant content, and each supported interruption level.

Apple guidance: [Notifications](https://developer.apple.com/design/human-interface-guidelines/notifications); [Managing notifications](https://developer.apple.com/design/human-interface-guidelines/managing-notifications)

### Lists tables and selection

**R135** Use lists for scannable, primarily textual rows and hierarchies. Use multicolumn tables when people compare several attributes, and consider collections for many images or items with widely varying sizes.

**R136** Keep row wording concise and preserve distinguishing text when space is narrow. Give columns descriptive headings and use a platform-appropriate grouping and row style. Offer sorting, reordering, or editing when it serves the task.

**R137** Make selection feedback fit its meaning. Hierarchical navigation often keeps a row highlighted to show the current path; choosing an option can use a checkmark after a brief highlight. On television, account for focus enlargement. On watches, make long lists manageable while retaining access to expected items.

Application note: Selection and editing conventions differ by platform and table role; do not assume every row tap means selection.

Practical check: Test empty, single-item, long, sorted, and selected lists. Check keyboard or focus traversal and confirm row actions remain distinguishable from navigation.

Apple guidance: [Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables)

### Charts and data understanding

**R138** Give a chart a clear purpose, a useful title, and a concise explanation of its main message. Make data visually prominent while labels, axes, and grid lines provide supporting context.

**R139** Fit the plot to the available space without losing units, labels, or meaningful detail. Provide accessible descriptions appropriate to the chart's purpose: individual values when those matter, or coherent summaries when overall shape is the message.

**R140** Describe what data represents, with actual values and sufficient context, instead of merely describing color or appearance. Avoid ambiguous date formats, unexplained abbreviations, and subjective labels. Keep axis references consistent. On watches, emphasize glanceable information and simple interactions.

Application note: Accessible chart content must convey the same useful insight as the visual chart; a generic image label is insufficient.

Practical check: Read the chart with VoiceOver and without color distinctions. Confirm units, period, series identity, empty states, and the relationship between the headline and underlying values.

Apple guidance: [Charts](https://developer.apple.com/design/human-interface-guidelines/charts)

## 3 Files sharing media and AI

Apply these chapters when the product includes the corresponding capability.

### Launch and return

**R141** Get people to an interactive first screen quickly. Separate any onboarding from the launch process.

**R142** Where a launch screen is required, make its static structure resemble the first screen so the transition does not flash or jump.

**R143** Respect supported orientation at launch. A landscape-only experience should work whichever way the device rotates.

**R144** For a fully immersive visionOS experience, consider beginning with a Shared Space window that gives context and lets the person choose when to enter immersion.

Practical check: Test cold launch, return from the background, and opening a specific item from a link. Record time to useful interaction and the destination shown.

Apple guidance: [Launching](https://developer.apple.com/design/human-interface-guidelines/launching)

### Sharing and collaboration

**R145** Put Share where people can find it, and prefer the system sharing interface. Distinguish sending a copy from inviting people to a shared item.

**R146** Explain access in short, concrete language. Let people understand who can view, who can edit, and whether others can invite participants.

**R147** Show collaboration status when sharing begins and provide a clear route to manage participants and permissions.

**R148** Keep custom collaboration actions limited to useful tasks. Link activity notifications to the relevant content instead of a generic landing screen.

Application note: Available sharing interfaces vary by platform. The HIG collaboration pattern is not available in tvOS; watchOS supports a system share sheet through ShareLink.

Practical check: Try the flow as an owner, an invited viewer, and a removed collaborator. Confirm the displayed access matches actual access.

Apple guidance: [Collaboration and sharing](https://developer.apple.com/design/human-interface-guidelines/collaboration-and-sharing)

### Audio

**R149** Choose audio behavior that matches the role of sound in the experience. Treat deliberate media playback differently from incidental interface sounds.

**R150** Respect system volume, expected silent-mode behavior, and other playing audio. Adjust your mix without changing the person's overall system volume.

**R151** Support familiar playback and output controls. Route to connected headphones and pause appropriately when headphones disconnect.

**R152** Handle interruptions deliberately. Resume only when the interruption and the type of experience justify it, and allow other apps to recover after temporary audio.

Application note: Audio categories have different mixing, background, and silent-mode behavior. One policy cannot be applied to every sound.

Practical check: Test with music already playing, silent mode enabled, an incoming call, and headphone removal. Verify each result matches the intended audio category.

Apple guidance: [Playing audio](https://developer.apple.com/design/human-interface-guidelines/playing-audio)

### Haptic feedback

**R153** Use standard haptic patterns with their documented meanings. Keep the relationship between an action and its tactile feedback consistent.

**R154** Coordinate haptics with visual and audio feedback. Make a haptic reinforce an event the person can understand.

**R155** Prefer brief, purposeful feedback in ordinary apps. Frequent or prolonged vibration can distract or become uncomfortable.

**R156** Allow haptics to be disabled and retain a usable experience without them. Check that vibration does not disrupt camera, microphone, or motion-sensitive tasks.

Application note: Haptic capability depends on the device and attached accessories. Do not assume every supported platform can produce the same feedback.

Practical check: Repeat the main task many times, then repeat with haptics disabled. Look for fatigue and missing information.

Apple guidance: [Playing haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics)

### Video playback

**R157** Prefer the system video player and preserve familiar playback, language, subtitle, and input behaviors.

**R158** Preserve the original aspect ratio. Avoid baking letterbox padding into the media, which can interfere with resizing and Picture in Picture.

**R159** Keep supporting information and overlays from obscuring the viewing experience. Return people to a relevant screen when playback ends or is dismissed.

**R160** In visionOS, let people choose when to begin immersive playback and maintain comfortable viewing. On Apple Watch, favor short clips that do not require a prolonged raised wrist.

Application note: Picture in Picture and player features vary by platform. Follow the specific platform subsection for the chosen player.

Practical check: Test captions, external playback controls, interruption, resizing, and returning from full screen. Confirm position and user context survive.

Apple guidance: [Playing video](https://developer.apple.com/design/human-interface-guidelines/playing-video)

### Printing

**R161** Expose Print through a familiar location, such as the macOS File menu or an appropriate sharing or action interface.

**R162** Offer the action only when printing is possible, using the platform's convention for disabling or hiding it.

**R163** Use the system print interface for supported options. Add application-specific choices only when they serve the document.

**R164** Make option dependencies clear, separate advanced settings, and show a preview when it helps people predict the result.

Application note: The HIG printing pattern applies to iOS, iPadOS, macOS, and visionOS; it is not supported in tvOS or watchOS.

Practical check: Print long text and multi-page content with different page sizes. Verify margins, page breaks, and the empty or unavailable-printer state.

Apple guidance: [Printing](https://developer.apple.com/design/human-interface-guidelines/printing)

### Generative AI features

**R165** Add generation where it provides a specific benefit. Identify AI involvement and explain useful capabilities and relevant limitations.

**R166** Keep people in control with nearby ways to edit, retry, discard, or undo results. Acknowledge their corrections.

**R167** Give truthful progress feedback during generation and a useful next step when a request fails or is blocked.

**R168** Explain what personal information is used, sent off-device, stored, or used for improvement. Seek appropriate permission and minimize the data involved.

**R169** Handle uncertain factual output carefully. Seek confirmation before significant actions that are destructive or difficult to reverse.

**R170** Test diverse inputs and model updates for bias and unexpected outcomes. Offer voluntary feedback and a non-AI path when the feature is supplementary.

Application note: Model capabilities, availability, and usage requirements require separate implementation checks.

Practical check: Test an unavailable model, a wrong answer, a blocked request, a retry, and rejection of generated content. Verify that original work remains recoverable.

Apple guidance: [Generative AI](https://developer.apple.com/design/human-interface-guidelines/generative-ai)

### Multitasking retain context and handle interruption

**R171** Save and restore context whenever people switch apps. Pause activities requiring active participation and support appropriate background completion of initiated tasks.

**R172** Handle audio interruptions according to their purpose and use completion notifications sparingly.

**R173** Adapt gracefully to window resizing and let system multitasking behavior govern window states.

Application note: In visionOS, merely looking away from a window must not pause its video. Background execution remains subject to platform limits.

Practical check: After switching away, resizing, or an interruption, can someone resume the task without lost work?

Apple guidance: [Multitasking](https://developer.apple.com/design/human-interface-guidelines/multitasking)

### File management preserve work and familiar file behavior

**R174** Prefer familiar document creation, opening, browsing, and saving interfaces. Provide expected commands and keyboard shortcuts.

**R175** Preserve work automatically during editing, closing, and app switching. Respect the person's autosave settings.

**R176** Let people choose appropriate names, formats, and destinations; use Quick Look for suitable previews.

Application note: On macOS, when autosaving is disabled, expose unsaved changes and offer saving before closing or quitting.

Practical check: Can someone find, reopen, and verify their latest work after closing or switching apps?

Apple guidance: [File management](https://developer.apple.com/design/human-interface-guidelines/file-management)

## 4 Platform rules

Design each supported platform as a complete experience with its own context and input expectations.

### iOS prioritize portable reachable tasks

**R177** Make the primary task and its content immediately apparent. Keep secondary controls discoverable without filling the display with competing actions.

**R178** Design for people holding the phone in one or both hands. Put frequent controls within comfortable reach and retain familiar back and list-row swipe interactions.

**R179** Adapt to orientation, Dark Mode, and Dynamic Type. A useful interface must survive the person's preferred configuration.

**R180** Integrate relevant capabilities, such as biometrics, location, widgets, shortcuts, and sharing, when they reduce effort. Obtain permission before using protected information.

**R181** Accommodate both brief visits and longer sessions; phone use is not always a short interaction.

Application note: This overview does not replace component-specific iPhone rules.

Practical check: Can the main task be completed comfortably while holding the phone?

Practical check: Do secondary actions remain discoverable after increasing text size and rotating the device?

Apple guidance: [Designing for iOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-ios)

### iPadOS use space and mixed input deliberately

**R182** Use the larger display to expose useful content and reduce unnecessary modal steps and full-screen transitions.

**R183** Choose content density using viewing distance and input mode, rather than treating iPad as an enlarged phone.

**R184** Support fluid switching among touch, physical keyboard, trackpad, Pencil, and voice where relevant. These methods often coexist during one task.

**R185** Accommodate orientation changes, multitasking configurations, Dark Mode, and Dynamic Type. Place controls where they remain reachable without covering the work.

**R186** Consider inter-app workflows, especially drag and drop, because people often work with several apps visible.

Application note: Verify windowing and multitasking behavior against the deployment target; the platform continues to evolve.

Practical check: Does the layout still work in the smallest supported window?

Practical check: Can someone continue the same editing task after changing input devices?

Apple guidance: [Designing for iPadOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-ipados)

### macOS support sustained flexible work

**R187** Use available display space for useful information and shallower navigation while retaining comfortable readability.

**R188** Support window resizing, moving, hiding, showing, and full-screen use so the app fits the person's workspace.

**R189** Provide commands through the menu bar and preserve standard keyboard shortcuts. Support keyboard-only workflows and precision pointer input.

**R190** Allow appropriate customization of toolbars and working views. Longer sessions benefit from an arrangement suited to the person's task.

**R191** Expect several apps and displays to participate in a workflow, with frequent switching between active and inactive states.

Application note: A visually enlarged mobile screen does not establish a complete Mac interaction model.

Practical check: Are important commands available from menus and appropriate shortcuts?

Practical check: Do windows remain useful when resized or moved between displays?

Apple guidance: [Designing for macOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-macos)

### watchOS make every glance useful

**R192** Show essential information immediately and keep common actions concise, focused, and possible with very few gestures.

**R193** Keep navigation shallow. Use the Digital Crown for vertical movement through content or screens.

**R194** Make timely information useful outside the app through complications and actionable notifications.

**R195** Use relevant on-device context to anticipate immediate needs, within applicable privacy permissions.

**R196** Give the watch app meaningful independent functionality. Supporting experiences may be used more often than the app's full interface.

**R197** Use background treatment and materials to clarify hierarchy without overwhelming the limited display.

Application note: Complications, Always On behavior, notifications, and hardware inputs each have further dedicated guidance.

Practical check: Is the most important information understandable during a brief wrist raise?

Practical check: Can the primary action be completed without navigating a deep hierarchy?

Apple guidance: [Designing for watchOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-watchos)

### tvOS design for distance and focus

**R198** Make text, artwork, and actionable items legible from across a room. Judge the design on a television at realistic viewing distance.

**R199** Use the system's focus behavior to show the current interaction target clearly as people navigate with the remote.

**R200** Support familiar Siri Remote gestures and consider other relevant inputs, including controllers and voice.

**R201** Use cinematic imagery, fluid motion, and appropriate audio in service of the content.

**R202** Make sign-in infrequent and easy. Support shared sign-in and changes of viewer profile when the experience is used by several people.

Application note: Consult tvOS layout, remote, Top Shelf, and media-specific chapters for detailed implementation decisions.

Practical check: Can someone always identify the focused item?

Practical check: Does the interface remain readable and navigable from the actual seating position?

Apple guidance: [Designing for tvOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-tvos)

### visionOS choose immersion around comfort

**R203** Use familiar windows for ordinary interface tasks; choose the least immersion needed for each meaningful moment.

**R204** Treat space, spatial audio, and immersion as functional capabilities. Avoid adding depth merely as decoration.

**R205** Keep people physically comfortable: avoid demanding head turns, extended reaches, repeated raised-arm interaction, or unnecessary movement.

**R206** Prioritize indirect eye-and-hand interaction so people can keep their hands relaxed. Reserve direct manipulation for suitable nearby objects.

**R207** Avoid jarring motion and maintain a stable frame of reference. Preserve accessibility alternatives and consider shared activities when appropriate.

Application note: The device's safety guidance and the specialized spatial-design chapters remain applicable.

Practical check: Can the experience be used while seated and relaxed?

Practical check: Is full immersion necessary for this task, and is its entry understandable?

Apple guidance: [Designing for visionOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-visionos)

### iPhone Duo preserve continuity through resizing and folding

**R208** Design for iPhone conventions while adapting to the device's inner and outer displays and changing poses. Standard components and resizable layouts provide the starting point.

**R209** Use size classes, safe areas, margins, and reserved regions instead of fixed dimensions. Account for active cameras and the folding region.

**R210** Preserve functionality, selection, and content state across displays. Expand the existing hierarchy when space allows rather than reinventing the interface.

**R211** Follow system placement of vertical toolbars, tab bars, and navigation; keep controls' relative positions consistent as the available space changes.

**R212** Make only necessary fold adjustments, retain access to overflowing actions, and prioritize frequently used controls. Use the system overflow menu and provide titles alongside toolbar symbols.

Application note: Apple's chapter was added September 9, 2026.

Practical check: During display changes, partial folding, and Split View, are the current task, content, and actions preserved and reachable?

Apple guidance: [Designing for iPhone Duo](https://developer.apple.com/design/human-interface-guidelines/designing-for-iphone-duo)

## 5 Input and system surfaces

Review additional input methods and the places where people encounter the product outside its main window.

### Gestures preserve expectations and alternatives

**R213** Use familiar gestures for their familiar actions. Do not assign a surprising meaning to a standard tap, swipe, drag, or zoom.

**R214** Give responsive feedback throughout manipulation, and make unavailable actions visibly understandable.

**R215** Provide alternatives for important gesture-driven tasks. A gesture must not be the sole route when people may need voice, keyboard, or assistive input.

**R216** Add custom gestures only for needs standard gestures do not satisfy. Make them discoverable, simple to describe, physically feasible, and distinct from existing gestures.

**R217** Keep shortcut gestures supplementary and avoid conflicts with system gestures.

Application note: Exact gesture movements and system-reserved interactions vary by platform.

Practical check: Can a new user predict the result of the standard gestures?

Practical check: Does every important custom gesture have an accessible alternative?

Apple guidance: [Gestures](https://developer.apple.com/design/human-interface-guidelines/gestures)

### Pointer input keep one coherent interaction model

**R218** Respond consistently to familiar mouse and trackpad gestures, and preserve systemwide gestures.

**R219** Allow people to switch fluidly between pointer, keyboard, touch, and spatial inputs without relearning the task.

**R220** Let pointer movement reveal controls that normally fade or minimize, such as playback controls or a minimized toolbar.

**R221** Keep modifier-key interactions consistent when people manipulate objects.

**R222** Treat pointer support on iPad and Apple Vision Pro as another way to interact, alongside the platform's other inputs.

Application note: Pointer appearance and effects have platform-specific guidance; avoid assuming Mac pointer conventions apply unchanged everywhere.

Practical check: Can hidden controls be revealed with a pointer?

Practical check: Do pointer and touch interactions produce consistent results for the same action?

Apple guidance: [Pointing devices](https://developer.apple.com/design/human-interface-guidelines/pointing-devices)

### Physical keyboards preserve familiar commands

**R223** Respect standard keyboard shortcuts. Assign new shortcuts to app-specific actions rather than overriding established meanings.

**R224** Support Full Keyboard Access where available and test by enabling it in the system's accessibility settings.

**R225** Make frequent app commands discoverable through the platform's shortcut interface.

**R226** In iPadOS, distinguish ordinary keyboard navigation from Full Keyboard Access: Apple advises using the latter for control activation and full interface navigation rather than adding ordinary focus navigation to every button or switch.

**R227** For games, allow suitable key-binding customization and preserve expected system commands.

Application note: Check platform and keyboard-layout differences before choosing custom shortcuts.

Practical check: Can a keyboard-only user reach and operate the supported interface?

Practical check: Do standard shortcuts retain the meaning people know from other apps?

Apple guidance: [Keyboards](https://developer.apple.com/design/human-interface-guidelines/keyboards)

### Focus and selection make the target predictable

**R228** Prefer system focus effects because they convey familiar, consistent feedback.

**R229** Avoid moving focus without a person's action. When a focused object disappears during directional navigation, choose a nearby predictable successor.

**R230** Distinguish being focused from being activated. On tvOS, moving focus should not unexpectedly open each item encountered.

**R231** Allow space and visual treatment for focused, selected, and unavailable states.

**R232** In visionOS, looking at an object produces hover feedback. This is distinct from the focus system used with connected input devices.

Application note: Do not describe gaze hover and keyboard or remote focus as interchangeable behaviors.

Practical check: Can people track their interaction target through updates and removals?

Practical check: Does moving focus avoid unexpected context changes?

Apple guidance: [Focus and selection](https://developer.apple.com/design/human-interface-guidelines/focus-and-selection)

### Spatial layout respect the available view

**R233** Position spatial content for comfortable viewing rather than assuming an identical field of view for everyone.

**R234** Avoid proliferating windows: too many can obscure the environment and make rearranging the app cumbersome.

**R235** Prefer indirect interaction for routine use. Directly reaching for content can become tiring, especially at or above eye level.

**R236** Use nearby direct manipulation only where the object invites it and the interaction is brief.

**R237** Evaluate depth and placement from several angles because people can view spatial content from different positions.

Application note: The system does not expose an individual's field-of-view measurement; avoid inventing universal spatial dimensions.

Practical check: Does the core workflow remain within a comfortable view?

Practical check: Can the person reposition the experience without managing excessive windows?

Apple guidance: [Spatial layout](https://developer.apple.com/design/human-interface-guidelines/spatial-layout)

### Widgets design for varied system appearances

**R238** Use flexible layouts and properly sized assets because widgets scale across devices and placements.

**R239** Preserve readable margins. Consult the widget-specific specifications rather than applying a universal app spacing rule.

**R240** Use real text elements and styles instead of rasterized text, preserving scaling and VoiceOver output.

**R241** Convey meaning through text and symbols as well as color; widgets can appear monochromatic or tinted.

**R242** Use full-color imagery deliberately when the person's chosen appearance desaturates other content. Avoid making the widget visually compete with its surroundings.

Application note: The chapter now includes visionOS and CarPlay considerations; check current platform sections when choosing supported contexts.

Practical check: Is the content understandable in tinted and monochromatic appearances?

Practical check: Do the supported widget families remain legible across device sizes?

Apple guidance: [Widgets](https://developer.apple.com/design/human-interface-guidelines/widgets)

### Live Activities communicate a bounded ongoing event

**R243** Use a Live Activity for an event or task with a beginning and end. Show concise, current progress rather than unrelated advertising.

**R244** Protect information that could be seen by bystanders; show a neutral summary or use appropriate redaction.

**R245** Support compact, minimal, expanded, and Lock Screen presentations, then refine additional contexts.

**R246** Open the relevant app destination when tapped. Keep embedded actions simple and directly related to the event.

**R247** Start at an expected moment, provide a way to stop, update when information changes, reserve alerts for essential updates, and end the activity promptly.

Application note: Current guidance spans iPhone/iPad, Mac menu bar, Apple Watch Smart Stack, and CarPlay; eligibility and appearance need separate verification.

Practical check: Does tapping open the relevant detail rather than the app's home screen?

Practical check: Are completion, stale content, privacy, and dismissal handled?

Apple guidance: [Live Activities](https://developer.apple.com/design/human-interface-guidelines/live-activities)

## 6 Practical review workflow

The following method is an editorial application of this handbook. Use it to collect evidence, track decisions, and keep exceptions visible. It is not an Apple certification process.

### Define the supported experience

Write a short product brief containing the audience, the three most important tasks, supported platforms and OS versions, likely devices and window sizes, supported languages, and any required integrations. List the screens and the user outcome each one supports. Decide which rulebook chapters apply before selecting visual treatments.

### Record implementation choices

Maintain a small decision record for each reusable component: its purpose, chosen system component, relevant rule IDs, supported inputs, visual states, data states, and exception rationale. If a custom control is necessary, document the user benefit and how its behavior will be verified. Record product-specific spacing, radii, colors, and timing as your choices; do not label an invented universal grid or animation duration as Apple policy.

### Design the state model

For every important flow, decide what the person sees before work begins, while it runs, and after success or failure. The matrix below is a practical specification template. Include only applicable states, with a reason for any omission.

| State | Question to answer | Evidence to keep |
| --- | --- | --- |
| First use | What meaningful action can the person take now? | First-run screen and task result |
| No content | Is this empty data, no matches, or a hidden filter? | Each distinct empty state |
| In progress | What operation is underway and what remains possible? | Slow-operation recording |
| Partial or stale data | Which content is current and which is missing? | Interrupted-update scenario |
| Invalid entry | What needs correction and which input is preserved? | Invalid-input example |
| Unavailable access | What can still be done in the current access state? | Denied and revoked access tests |
| Failure | What happened and what can be retried safely? | Failure and recovery result |
| Success | What changed and where can the result be found? | Saved result and return path |
| Cancellation | What stopped and what was retained? | Before and after comparison |

### Review journeys rather than isolated screens

Choose realistic task scenarios with a clear starting state and an observable result. For a simple record app, use: find an existing record; create one from incomplete information; correct a mistake after saving. Run each scenario across the applicable platform and input combinations. The point of the example is the end-to-end task, not a prescribed record-app layout.

| Review pass | Evidence required |
| --- | --- |
| Normal task | A complete task recording and the resulting data or content |
| Adaptation | Representative narrow, wide, long-text, and supported appearance states |
| Access and input | Observed results for supported assistive and alternative input methods |
| Interruption | Return behavior after navigation away, suspension, or an interrupted operation |
| Recovery | A demonstrated correction path after invalid input or a failed operation |
| Integration | The feature-specific HIG source, API availability, and tested system entry points |
| Content review | Final labels, representative translations, sample data, and meaningful error messages |

### Use a traceable review record

For each issue, record the affected screen, rule ID or specialist source, expected behavior, observed behavior, reproduction steps, evidence, owner, and next action. Mark items Pass, Fix, or Not applicable. Explain Not applicable decisions. Treat loss of work or inability to complete a core task as a release decision that needs an explicit owner; a simple issue count is not a readiness score.

### Prepare the handover

Deliver the approved flows, reusable components, appearance and text variants, relevant state matrix, accessibility behavior, platform differences, reviewed exceptions, and the list of current HIG sources. Keep the original decisions and evidence available when revising the design. Recheck the affected official pages when the deployment target or a system component changes.

### Apply the ideas outside native Apple apps

For a website or a non-Apple product, use this handbook as a usability reference and follow that platform's own interaction and accessibility standards. Use its native semantic controls, keyboard behavior, and measurement units. Copying the appearance of an Apple control does not reproduce its system behavior.

## 7 Complete topic routing directory

Use this directory when the product includes a specialized component, interaction, or integration. It provides the wider route through Apple's HIG, including topics beyond the summarized chapters. Check the linked page and its platform subsection before implementation. All titles below are clickable in the digital files.

The directory describes the topic structure inspected for this edition. Apple can rename, regroup, or expand it. The live HIG is the place to resolve later changes.

### Getting started

[Design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles) / [Designing for iOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-ios) / [Designing for iPadOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-ipados) / [Designing for macOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-macos) / [Designing for tvOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-tvos) / [Designing for visionOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-visionos) / [Designing for watchOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-watchos)

[Designing for games](https://developer.apple.com/design/human-interface-guidelines/designing-for-games) / [Designing for iPhone Duo](https://developer.apple.com/design/human-interface-guidelines/designing-for-iphone-duo)

### Foundations

[Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) / [App icons](https://developer.apple.com/design/human-interface-guidelines/app-icons) / [Branding](https://developer.apple.com/design/human-interface-guidelines/branding) / [Color](https://developer.apple.com/design/human-interface-guidelines/color) / [Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode) / [Icons](https://developer.apple.com/design/human-interface-guidelines/icons) / [Images](https://developer.apple.com/design/human-interface-guidelines/images)

[Immersive experiences](https://developer.apple.com/design/human-interface-guidelines/immersive-experiences) / [Inclusion](https://developer.apple.com/design/human-interface-guidelines/inclusion) / [Layout](https://developer.apple.com/design/human-interface-guidelines/layout) / [Materials](https://developer.apple.com/design/human-interface-guidelines/materials) / [Motion](https://developer.apple.com/design/human-interface-guidelines/motion) / [Privacy](https://developer.apple.com/design/human-interface-guidelines/privacy) / [Right to left](https://developer.apple.com/design/human-interface-guidelines/right-to-left)

[SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols) / [Spatial layout](https://developer.apple.com/design/human-interface-guidelines/spatial-layout) / [Typography](https://developer.apple.com/design/human-interface-guidelines/typography) / [Writing](https://developer.apple.com/design/human-interface-guidelines/writing)

### Patterns

[Charting data](https://developer.apple.com/design/human-interface-guidelines/charting-data) / [Collaboration and sharing](https://developer.apple.com/design/human-interface-guidelines/collaboration-and-sharing) / [Drag and drop](https://developer.apple.com/design/human-interface-guidelines/drag-and-drop) / [Entering data](https://developer.apple.com/design/human-interface-guidelines/entering-data) / [Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback) / [File management](https://developer.apple.com/design/human-interface-guidelines/file-management) / [Going full screen](https://developer.apple.com/design/human-interface-guidelines/going-full-screen)

[Launching](https://developer.apple.com/design/human-interface-guidelines/launching) / [Live-viewing apps](https://developer.apple.com/design/human-interface-guidelines/live-viewing-apps) / [Loading](https://developer.apple.com/design/human-interface-guidelines/loading) / [Managing accounts](https://developer.apple.com/design/human-interface-guidelines/managing-accounts) / [Managing notifications](https://developer.apple.com/design/human-interface-guidelines/managing-notifications) / [Modality](https://developer.apple.com/design/human-interface-guidelines/modality) / [Multitasking](https://developer.apple.com/design/human-interface-guidelines/multitasking)

[Offering help](https://developer.apple.com/design/human-interface-guidelines/offering-help) / [Onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding) / [Playing audio](https://developer.apple.com/design/human-interface-guidelines/playing-audio) / [Playing haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics) / [Playing video](https://developer.apple.com/design/human-interface-guidelines/playing-video) / [Printing](https://developer.apple.com/design/human-interface-guidelines/printing) / [Ratings and reviews](https://developer.apple.com/design/human-interface-guidelines/ratings-and-reviews)

[Searching](https://developer.apple.com/design/human-interface-guidelines/searching) / [Settings](https://developer.apple.com/design/human-interface-guidelines/settings) / [Undo and redo](https://developer.apple.com/design/human-interface-guidelines/undo-and-redo) / [Workouts](https://developer.apple.com/design/human-interface-guidelines/workouts)

### Components

[Content](https://developer.apple.com/design/human-interface-guidelines/content) / [Layout and organization](https://developer.apple.com/design/human-interface-guidelines/layout-and-organization) / [Menus and actions](https://developer.apple.com/design/human-interface-guidelines/menus-and-actions) / [Navigation and search](https://developer.apple.com/design/human-interface-guidelines/navigation-and-search) / [Presentation](https://developer.apple.com/design/human-interface-guidelines/presentation) / [Selection and input](https://developer.apple.com/design/human-interface-guidelines/selection-and-input) / [Status](https://developer.apple.com/design/human-interface-guidelines/status)

[System experiences](https://developer.apple.com/design/human-interface-guidelines/system-experiences)

### Components Content

[Charts](https://developer.apple.com/design/human-interface-guidelines/charts) / [Image views](https://developer.apple.com/design/human-interface-guidelines/image-views) / [Text views](https://developer.apple.com/design/human-interface-guidelines/text-views) / [Web views](https://developer.apple.com/design/human-interface-guidelines/web-views)

### Components Layout and organization

[Boxes](https://developer.apple.com/design/human-interface-guidelines/boxes) / [Collections](https://developer.apple.com/design/human-interface-guidelines/collections) / [Column views](https://developer.apple.com/design/human-interface-guidelines/column-views) / [Disclosure controls](https://developer.apple.com/design/human-interface-guidelines/disclosure-controls) / [Labels](https://developer.apple.com/design/human-interface-guidelines/labels) / [Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables) / [Lockups](https://developer.apple.com/design/human-interface-guidelines/lockups)

[Outline views](https://developer.apple.com/design/human-interface-guidelines/outline-views) / [Split views](https://developer.apple.com/design/human-interface-guidelines/split-views) / [Tab views](https://developer.apple.com/design/human-interface-guidelines/tab-views)

### Components Menus and actions

[Activity views](https://developer.apple.com/design/human-interface-guidelines/activity-views) / [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons) / [Context menus](https://developer.apple.com/design/human-interface-guidelines/context-menus) / [Dock menus](https://developer.apple.com/design/human-interface-guidelines/dock-menus) / [Edit menus](https://developer.apple.com/design/human-interface-guidelines/edit-menus) / [Home Screen quick actions](https://developer.apple.com/design/human-interface-guidelines/home-screen-quick-actions) / [Menus](https://developer.apple.com/design/human-interface-guidelines/menus)

[Ornaments](https://developer.apple.com/design/human-interface-guidelines/ornaments) / [Pop-up buttons](https://developer.apple.com/design/human-interface-guidelines/pop-up-buttons) / [Pull-down buttons](https://developer.apple.com/design/human-interface-guidelines/pull-down-buttons) / [The menu bar](https://developer.apple.com/design/human-interface-guidelines/the-menu-bar) / [Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars)

### Components Navigation and search

[Path controls](https://developer.apple.com/design/human-interface-guidelines/path-controls) / [Search fields](https://developer.apple.com/design/human-interface-guidelines/search-fields) / [Sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars) / [Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) / [Token fields](https://developer.apple.com/design/human-interface-guidelines/token-fields)

### Components Presentation

[Action sheets](https://developer.apple.com/design/human-interface-guidelines/action-sheets) / [Alerts](https://developer.apple.com/design/human-interface-guidelines/alerts) / [Page controls](https://developer.apple.com/design/human-interface-guidelines/page-controls) / [Panels](https://developer.apple.com/design/human-interface-guidelines/panels) / [Popovers](https://developer.apple.com/design/human-interface-guidelines/popovers) / [Scroll views](https://developer.apple.com/design/human-interface-guidelines/scroll-views) / [Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets)

[Windows](https://developer.apple.com/design/human-interface-guidelines/windows)

### Components Selection and input

[Color wells](https://developer.apple.com/design/human-interface-guidelines/color-wells) / [Combo boxes](https://developer.apple.com/design/human-interface-guidelines/combo-boxes) / [Digit entry views](https://developer.apple.com/design/human-interface-guidelines/digit-entry-views) / [Image wells](https://developer.apple.com/design/human-interface-guidelines/image-wells) / [Pickers](https://developer.apple.com/design/human-interface-guidelines/pickers) / [Segmented controls](https://developer.apple.com/design/human-interface-guidelines/segmented-controls) / [Sliders](https://developer.apple.com/design/human-interface-guidelines/sliders)

[Steppers](https://developer.apple.com/design/human-interface-guidelines/steppers) / [Text fields](https://developer.apple.com/design/human-interface-guidelines/text-fields) / [Toggles](https://developer.apple.com/design/human-interface-guidelines/toggles) / [Virtual keyboards](https://developer.apple.com/design/human-interface-guidelines/virtual-keyboards)

### Components Status

[Activity rings](https://developer.apple.com/design/human-interface-guidelines/activity-rings) / [Gauges](https://developer.apple.com/design/human-interface-guidelines/gauges) / [Progress indicators](https://developer.apple.com/design/human-interface-guidelines/progress-indicators) / [Rating indicators](https://developer.apple.com/design/human-interface-guidelines/rating-indicators)

### Components System experiences

[App Shortcuts](https://developer.apple.com/design/human-interface-guidelines/app-shortcuts) / [Complications](https://developer.apple.com/design/human-interface-guidelines/complications) / [Controls](https://developer.apple.com/design/human-interface-guidelines/controls) / [Live Activities](https://developer.apple.com/design/human-interface-guidelines/live-activities) / [Notifications](https://developer.apple.com/design/human-interface-guidelines/notifications) / [Snippets](https://developer.apple.com/design/human-interface-guidelines/snippets) / [Status bars](https://developer.apple.com/design/human-interface-guidelines/status-bars)

[Top Shelf](https://developer.apple.com/design/human-interface-guidelines/top-shelf) / [Watch faces](https://developer.apple.com/design/human-interface-guidelines/watch-faces) / [Widgets](https://developer.apple.com/design/human-interface-guidelines/widgets)

### Inputs

[Action button](https://developer.apple.com/design/human-interface-guidelines/action-button) / [Apple Pencil and Scribble](https://developer.apple.com/design/human-interface-guidelines/apple-pencil-and-scribble) / [Camera Control](https://developer.apple.com/design/human-interface-guidelines/camera-control) / [Digital Crown](https://developer.apple.com/design/human-interface-guidelines/digital-crown) / [Eyes](https://developer.apple.com/design/human-interface-guidelines/eyes) / [Focus and selection](https://developer.apple.com/design/human-interface-guidelines/focus-and-selection) / [Game controls](https://developer.apple.com/design/human-interface-guidelines/game-controls)

[Gestures](https://developer.apple.com/design/human-interface-guidelines/gestures) / [Gyroscope and accelerometer](https://developer.apple.com/design/human-interface-guidelines/gyro-and-accelerometer) / [Keyboards](https://developer.apple.com/design/human-interface-guidelines/keyboards) / [Nearby interactions](https://developer.apple.com/design/human-interface-guidelines/nearby-interactions) / [Pointing devices](https://developer.apple.com/design/human-interface-guidelines/pointing-devices) / [Remotes](https://developer.apple.com/design/human-interface-guidelines/remotes)

### Technologies

[AirPlay](https://developer.apple.com/design/human-interface-guidelines/airplay) / [Always On](https://developer.apple.com/design/human-interface-guidelines/always-on) / [App Clips](https://developer.apple.com/design/human-interface-guidelines/app-clips) / [Apple In-App Purchase](https://developer.apple.com/design/human-interface-guidelines/apple-in-app-purchase) / [Apple Pay](https://developer.apple.com/design/human-interface-guidelines/apple-pay) / [Augmented reality](https://developer.apple.com/design/human-interface-guidelines/augmented-reality) / [CareKit](https://developer.apple.com/design/human-interface-guidelines/carekit)

[CarPlay](https://developer.apple.com/design/human-interface-guidelines/carplay) / [Game Center](https://developer.apple.com/design/human-interface-guidelines/game-center) / [Generative AI](https://developer.apple.com/design/human-interface-guidelines/generative-ai) / [HealthKit](https://developer.apple.com/design/human-interface-guidelines/healthkit) / [HomeKit](https://developer.apple.com/design/human-interface-guidelines/homekit) / [iCloud](https://developer.apple.com/design/human-interface-guidelines/icloud) / [ID Verifier](https://developer.apple.com/design/human-interface-guidelines/id-verifier)

[iMessage apps and stickers](https://developer.apple.com/design/human-interface-guidelines/imessage-apps-and-stickers) / [Live Photos](https://developer.apple.com/design/human-interface-guidelines/live-photos) / [Mac Catalyst](https://developer.apple.com/design/human-interface-guidelines/mac-catalyst) / [Machine learning](https://developer.apple.com/design/human-interface-guidelines/machine-learning) / [Maps](https://developer.apple.com/design/human-interface-guidelines/maps) / [NFC](https://developer.apple.com/design/human-interface-guidelines/nfc) / [Photo editing](https://developer.apple.com/design/human-interface-guidelines/photo-editing)

[ResearchKit](https://developer.apple.com/design/human-interface-guidelines/researchkit) / [SharePlay](https://developer.apple.com/design/human-interface-guidelines/shareplay) / [ShazamKit](https://developer.apple.com/design/human-interface-guidelines/shazamkit) / [Sign in with Apple](https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple) / [Siri](https://developer.apple.com/design/human-interface-guidelines/siri) / [Tap to Pay on iPhone](https://developer.apple.com/design/human-interface-guidelines/tap-to-pay-on-iphone) / [VoiceOver](https://developer.apple.com/design/human-interface-guidelines/voiceover)

[Wallet](https://developer.apple.com/design/human-interface-guidelines/wallet)

### Official starting points

[Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/) / [Apple design resources](https://developer.apple.com/design/resources/) / [Apple design hub](https://developer.apple.com/design/) / [App Store guidelines](https://developer.apple.com/app-store/guidelines/)

### Sources used for the numbered rules

The source links beside each chapter identify the Apple pages used for its rules. The wider directory is a routing aid; its presence does not mean every linked article is summarized.
