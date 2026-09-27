import { Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { DailyLessons } from '../../core/plugins/daily-lessons.plugin';

export type AppLanguage = 'hu' | 'en';

const STORAGE_KEY = 'striveup-language';

const HU: Record<string, string> = {
  'Habit Tracker': 'Szokáskövető',
  'Small actions. Compounded daily.': 'Kis lépések. Napról napra összeadódnak.',
  'Today': 'Ma',
  'Today:': 'Ma:',
  'Habits': 'Szokások',
  'Habit': 'Szokás',
  'Add': 'Hozzáadás',
  'Reports': 'Kimutatások',
  'Settings': 'Beállítások',
  'Built for consistent, meaningful habits.': 'Tartós, értelmes szokásokhoz készült.',
  'Add new habit': 'Új szokás hozzáadása',
  'Back': 'Vissza',
  'Cancel': 'Mégse',
  'Next': 'Tovább',
  'Skip': 'Kihagyás',
  'Remove': 'Eltávolítás',
  'Delete': 'Törlés',
  'Disable': 'Kikapcsolás',
  'Reset': 'Visszaállítás',
  'View': 'Megnyitás',
  'Details': 'Részletek',
  'Done': 'Kész',
  'Done!': 'Kész!',
  'Undo': 'Visszavonás',
  'Save habit': 'Szokás mentése',
  'Save log': 'Naplóbejegyzés mentése',
  'Edit habit': 'Szokás szerkesztése',
  'Review habit': 'Szokás áttekintése',
  'View habit': 'Szokás megnyitása',
  'Return to habits': 'Vissza a szokásokhoz',
  'Back to habits': 'Vissza a szokásokhoz',
  'Close log modal': 'Naplóablak bezárása',
  'More actions': 'További műveletek',
  'Press Enter to save': 'Nyomj Entert a mentéshez',
  'Add context or reflections...': 'Adj hozzá körülményeket vagy gondolatokat…',
  'No entry yet today': 'Ma még nincs bejegyzés',
  'Nothing due today': 'Mára nincs esedékes feladat',
  'No habits recorded yet': 'Még nincs felvett szokás',
  'No habits match the current filters.': 'Egy szokás sem felel meg a jelenlegi szűrőknek.',
  'Give your habit a name.': 'Adj nevet a szokásodnak.',
  'Title': 'Név',
  'Type': 'Típus',
  'Binary': 'Igen/nem',
  'Quantitative': 'Mennyiségi',
  'Description': 'Leírás',
  'Goal period': 'Cél időszaka',
  'Daily target': 'Napi cél',
  'Numerical target (optional)': 'Számszerű cél (nem kötelező)',
  'Unit': 'Mértékegység',
  'Units': 'Mértékegység',
  'Times per period': 'Alkalom időszakonként',
  'Per week': 'Hetente',
  'Per month': 'Havonta',
  'Day': 'Nap',
  'Week': 'Hét',
  'Month': 'Hónap',
  'Tags': 'Címkék',
  'Reminder': 'Emlékeztető',
  'Repeat': 'Ismétlés',
  'Time': 'Időpont',
  'Every day': 'Minden nap',
  'Weekdays': 'Hétköznapokon',
  'Custom days': 'Egyéni napok',
  'Keep reminding until completed': 'Ismételje a teljesítésig',
  'Allow intentional skips without breaking streak': 'A szándékos kihagyás ne szakítsa meg a sorozatot',
  'Morning meditation': 'Reggeli meditáció',
  'Add context, motivation, or instructions': 'Adj hozzá körülményeket, motivációt vagy útmutatást',
  'minutes, glasses, pages...': 'perc, pohár, oldal…',
  'kilometers, minutes, pages...': 'kilométer, perc, oldal…',
  'Comma separated e.g. health, focus, routine': 'Vesszővel elválasztva, pl. egészség, fókusz, rutin',
  'Reminders send a gentle nudge at your selected time. Use "persistent" if you want the notification to stay until you log.': 'Az emlékeztetők finoman jeleznek a kiválasztott időpontban. A tartós beállítással a jelzés naplózásig megmarad.',
  'Strategy': 'Módszer',
  'Choose a framework to guide this habit\'s setup. Each option provides coaching prompts to help you define a clear plan.': 'Válassz módszert a szokás megtervezéséhez. Mindegyik segítő kérdésekkel támogat egy világos terv kialakításában.',
  'No framework selected. You can add one at any time.': 'Nincs kiválasztott módszer. Később bármikor hozzáadhatsz egyet.',
  'SMART goal details': 'SMART cél részletei',
  'Goal': 'Cél',
  'Why': 'Miért',
  'Deadline': 'Határidő',
  'Target metric': 'Mérőszám',
  'Target value': 'Célérték',
  'Clarify what success looks like, how you\'ll measure it, and why the finish line matters.': 'Tisztázd, hogyan néz ki a siker, mivel méred, és miért fontos a cél elérése.',
  'e.g. Jog 3 km every morning': 'pl. Fuss minden reggel 3 km-t',
  'Why is this habit meaningful right now? Visualize what happens when you stick with it.': 'Miért fontos most ez a szokás? Képzeld el, mi történik, ha kitartasz mellette.',
  'e.g. Q1 2024': 'pl. 2026 első negyedév',
  'Describe what you will measure.': 'Írd le, mit fogsz mérni.',
  'e.g. 80': 'pl. 80',
  'WOOP plan': 'WOOP terv',
  'Wish': 'Kívánság',
  'Outcome': 'Eredmény',
  'Obstacle': 'Akadály',
  'If-Then Plan': 'Ha–akkor terv',
  'Capture your Wish, visualize the Outcome, anticipate Obstacles, and script an if-then Plan you can rely on.': 'Fogalmazd meg a kívánságod, képzeld el az eredményt, lásd előre az akadályokat, és készíts használható ha–akkor tervet.',
  'Describe your wish in a sentence.': 'Fogalmazd meg egy mondatban a kívánságodat.',
  'Describe the best thing that happens if this habit sticks.': 'Írd le a legjobb eredményt, ha a szokás tartóssá válik.',
  'What inner obstacle might get in the way?': 'Milyen belső akadály állhat az utadba?',
  'Craft a concrete if-then: If [obstacle], then I will [response].': 'Alkoss konkrét ha–akkor tervet: Ha [akadály], akkor [válasz].',
  'OKR snapshot': 'OKR áttekintés',
  'Objective': 'Célkitűzés',
  'Key result': 'Kulcseredmény',
  'Connect this habit to a larger Objective and concrete Key Result so daily wins ladder up to big goals.': 'Kapcsold a szokást egy nagyobb célkitűzéshez és konkrét kulcseredményhez, hogy a napi sikerek a nagy cél felé vezessenek.',
  'What inspiring objective does this habit support?': 'Milyen inspiráló célkitűzést támogat ez a szokás?',
  'Define the measurable result this habit influences. How will you know you\'re on track?': 'Határozd meg a mérhető eredményt. Honnan tudod majd, hogy jó úton jársz?',
  'Tiny habit recipe': 'Apró szokás receptje',
  'Anchor': 'Horgony',
  'Tiny version': 'Apró változat',
  'Celebration': 'Ünneplés',
  'Anchor a tiny version of your habit to a reliable routine. Start ridiculously small so it never feels daunting.': 'Kapcsold a szokás apró változatát egy biztos rutinhoz. Kezdd nevetségesen kicsiben, hogy sose tűnjön nehéznek.',
  'After I...': 'Miután…',
  'After I brush my teeth': 'Miután fogat mosok',
  'Do 2 push-ups': 'Csinálok 2 fekvőtámaszt',
  'And celebrate by...': 'És így ünneplek…',
  'High-five myself': 'Pacsi magamnak',
  'Goal Compass': 'Céliránytű',
  'Goal Compass setup': 'Céliránytű beállítása',
  'Goal. Why. Vision. Next.': 'Cél. Miért. Jövőkép. Következő lépés.',
  'Define one clear goal and align your direction, vision, and next move.': 'Határozz meg egy világos célt, és hangold össze az irányt, a jövőképet és a következő lépést.',
  'Goal name': 'Cél neve',
  'Core why': 'Alapvető miért',
  'Vision snapshot': 'Jövőkép',
  'Next main goal': 'Következő fő cél',
  'Next main goal step': 'A következő fő lépés',
  'What do you most want to accomplish? (Keep it meaningful and realistic.)': 'Mit szeretnél leginkább elérni? Legyen fontos és reális.',
  'Why does this goal matter right now?': 'Miért fontos ez a cél éppen most?',
  'Describe what success looks like when this goal is achieved.': 'Írd le, hogyan néz ki a siker a cél elérésekor.',
  'What is the next concrete action toward this goal?': 'Mi a következő konkrét lépés a cél felé?',
  'Your better life begins with one clear direction.': 'Egy jobb élet egy világos iránnyal kezdődik.',
  'Fill in Goal Compass now, or skip and continue. You can update these values later from Settings.': 'Töltsd ki most a Céliránytűt, vagy hagyd ki és folytasd. Később a Beállításokban módosíthatod.',
  'Fill in Goal name, Core why, Vision snapshot, and Next main goal step to continue.': 'A folytatáshoz töltsd ki a cél nevét, a miértet, a jövőképet és a következő fő lépést.',
  'Skip for now': 'Most kihagyom',
  'Save and continue': 'Mentés és folytatás',
  'Finding Direction': 'Iránykeresés',
  'Compass Values': 'Az iránytű értékei',
  'Goal:': 'Cél:',
  'Why:': 'Miért:',
  'Vision:': 'Jövőkép:',
  'Next:': 'Következő:',
  'Welcome': 'Üdvözlünk',
  'Make the most of your dashboard': 'Hozd ki a legtöbbet az áttekintőből',
  'Log from cards, open quick actions, and swipe through insights. You can re-open this guide in Settings later.': 'Naplózz a kártyákról, használd a gyorsműveleteket, és lapozd át a tippeket. Ezt az útmutatót később a Beállításokból újra megnyithatod.',
  'Got it': 'Értem',
  'Skip tutorial': 'Bemutató kihagyása',
  'This area is still loading on this device view, so the tour will continue.': 'Ez a terület még betöltődik ezen az eszközön, ezért a bemutató folytatódik.',
  'Good next step': 'Jó következő lépés',
  'Do now': 'Megcsinálom',
  'Later': 'Később',
  'Streak': 'Sorozat',
  'Current streak': 'Jelenlegi sorozat',
  'Legend': 'Legenda',
  'On fire': 'Lendületben',
  'Great run': 'Remek sorozat',
  'Daily progress': 'Napi haladás',
  'Weekly completion': 'Heti teljesítés',
  'Summary statistics': 'Összesített statisztikák',
  'Focus habit': 'Kiemelt szokás',
  'Spotlight the habit with the strongest momentum.': 'Emeld ki a legerősebb lendületű szokást.',
  'Completion': 'Teljesítés',
  'Strength': 'Erősség',
  'Filters': 'Szűrők',
  'Compare performance across tags and time ranges.': 'Hasonlítsd össze a teljesítményt címkék és időszakok szerint.',
  'Tag': 'Címke',
  'Timeframe': 'Időszak',
  'Habit health': 'Szokások állapota',
  'All': 'Mind',
  'Strongest': 'Legerősebb',
  'Needs attention': 'Figyelmet igényel',
  'No focus habit selected. Choose a strongest/attention habit to spotlight.': 'Nincs kiemelt szokás. Válassz egy erős vagy figyelmet igénylő szokást.',
  'Log a few entries to spotlight a habit here.': 'Naplózz néhány alkalmat, hogy itt kiemelhess egy szokást.',
  'Log habits consistently to unlock detailed analytics, streak trends, and heatmaps.': 'Naplózz rendszeresen a részletes elemzések, sorozatok és hőtérképek megnyitásához.',
  'No data yet.': 'Még nincs adat.',
  'No categories yet. Add tags to habits to see distribution.': 'Még nincsenek kategóriák. Adj címkéket a szokásokhoz az eloszlás megjelenítéséhez.',
  'Not enough data yet to display a heatmap. Log more habits to unlock insights.': 'Még nincs elég adat a hőtérképhez. Naplózz több szokást.',
  'Not enough data yet. Keep logging to get personalized habit insights.': 'Még nincs elég adat. Folytasd a naplózást a személyre szabott elemzésekhez.',
  'Search habits…': 'Szokások keresése…',
  'Sort': 'Rendezés',
  'Recently created': 'Legutóbb létrehozott',
  'Name A→Z': 'Név A→Z',
  'Created': 'Létrehozva',
  'Are you sure you want to delete?': 'Biztosan törölni szeretnéd?',
  'Habit not found.': 'A szokás nem található.',
  'Recent Activity': 'Legutóbbi aktivitás',
  'Notes': 'Jegyzetek',
  'Notes:': 'Jegyzetek:',
  'No strategy attached yet.': 'Még nincs módszer hozzárendelve.',
  'Habit Chain': 'Szokáslánc',
  'Link this habit to natural before/after actions so you can complete small routines with less friction.': 'Kapcsold ezt a szokást természetes előtte/utána műveletekhez, hogy könnyebben alakíts ki rutint.',
  'Before you start this habit:': 'Mielőtt elkezded ezt a szokást:',
  'Before this habit': 'E szokás előtt',
  'After this habit': 'E szokás után',
  'Triggered by': 'Ezek indítják',
  'No before-links yet.': 'Még nincs előtte kapcsolat.',
  'No after-links yet.': 'Még nincs utána kapcsolat.',
  'This habit is not linked from others yet.': 'Más szokás még nem kapcsolódik ehhez.',
  'Add linked habit': 'Kapcsolt szokás hozzáadása',
  'Linked habit': 'Kapcsolt szokás',
  'Select a habit': 'Válassz szokást',
  'Relation': 'Kapcsolat',
  'Only suggest when the linked habit is due': 'Csak akkor javasolja, ha a kapcsolt szokás esedékes',
  'Skip if completed in last hours': 'Kihagyás, ha az elmúlt órákban teljesült',
  'Priority': 'Prioritás',
  'Note (optional)': 'Megjegyzés (nem kötelező)',
  'Why this link helps': 'Miért segít ez a kapcsolat',
  'Add link': 'Kapcsolat hozzáadása',
  'Manage reminders, appearance, onboarding helpers, and data ownership.': 'Kezeld az emlékeztetőket, a megjelenést, a bemutatót és az adataidat.',
  'Language': 'Nyelv',
  'Choose the language used throughout the app, widgets, and notifications.': 'Válaszd ki az alkalmazásban, a widgeteken és az értesítésekben használt nyelvet.',
  'Hungarian': 'Magyar',
  'English': 'Angol',
  'Onboarding': 'Bemutató',
  'Replay the full guided walkthrough with arrows and feature descriptions.': 'Indítsd újra a teljes útmutatót nyilakkal és funkcióleírásokkal.',
  'Run full tutorial': 'Teljes bemutató indítása',
  'Motivational mode': 'Motivációs mód',
  'When off, daily motivational notifications are disabled and Goal Compass does not appear on app startup.': 'Kikapcsolva nem érkeznek napi motivációs értesítések, és indításkor nem jelenik meg a Céliránytű.',
  'Toggle motivational mode': 'Motivációs mód kapcsolása',
  'Enabled': 'Bekapcsolva',
  'Disabled': 'Kikapcsolva',
  'Appearance': 'Megjelenés',
  'System': 'Rendszer',
  'Light': 'Világos',
  'Dark': 'Sötét',
  'Accent': 'Kiemelőszín',
  'Update your direction anytime. The startup spinner appears only when values are saved.': 'Bármikor módosíthatod az irányt. Az indítási animáció csak mentett értékeknél jelenik meg.',
  'Build a healthier daily routine': 'Alakíts ki egészségesebb napi rutint',
  'Why does this matter now?': 'Miért fontos ez most?',
  'How does success look?': 'Hogyan néz ki a siker?',
  'What is your next main goal step?': 'Mi a következő fő lépésed?',
  'Fill in all Goal Compass fields before saving.': 'Mentés előtt töltsd ki a Céliránytű minden mezőjét.',
  'Clear values': 'Értékek törlése',
  'Save Goal Compass': 'Céliránytű mentése',
  'Reminders': 'Emlékeztetők',
  'Request permission': 'Engedély kérése',
  'Reminders keep habits top of mind. Adjust them below or create new ones when editing a habit.': 'Az emlékeztetők segítenek észben tartani a szokásokat. Alább módosíthatod őket, vagy szerkesztéskor újat hozhatsz létre.',
  'Persistent reminders will repeat until the habit is logged each day.': 'A tartós emlékeztetők addig ismétlődnek, amíg aznap nem naplózod a szokást.',
  'No active reminders. Enable them when creating or editing a habit to get notified.': 'Nincs aktív emlékeztető. Kapcsold be egy szokás létrehozásakor vagy szerkesztésekor.',
  'Create reminder': 'Emlékeztető létrehozása'
  ,'Amount': 'Mennyiség'
  ,'I will...': 'Ezt fogom tenni…'
  ,'Motivation': 'Motiváció'
  ,'Period': 'Időszak'
  ,'Vision': 'Jövőkép'
  ,'Active habits': 'Aktív szokások'
  ,'Currently tracking': 'Jelenleg követve'
  ,'Avg completion': 'Átlagos teljesítés'
  ,'Entries logged': 'Naplózott bejegyzések'
  ,'Within filters': 'A szűrésben'
  ,'Best current run': 'Legjobb jelenlegi sorozat'
  ,'Top streak': 'Legjobb sorozat'
  ,'Longest streak': 'Leghosszabb sorozat'
  ,'Longest streak coming soon': 'A leghosszabb sorozat hamarosan megjelenik'
  ,'Activity': 'Aktivitás'
  ,'Progress': 'Haladás'
  ,'Target': 'Célérték'
  ,'Trend': 'Trend'
  ,'Missed': 'Kimaradt'
  ,'All-time': 'Minden időszak'
  ,'Last 7 days': 'Elmúlt 7 nap'
  ,'Last 30 days': 'Elmúlt 30 nap'
  ,'Last 8 weeks': 'Elmúlt 8 hét'
  ,'Quarter': 'Negyedév'
  ,'Year': 'Év'
  ,'Analytics and habit health': 'Elemzések és a szokások állapota'
  ,'Habit categories': 'Szokáskategóriák'
  ,'Each card opens details, streak history, and delete actions from the menu.': 'Minden kártyáról megnyithatod a részleteket, a sorozatelőzményeket és a törlést.'
  ,'Search, filter, sort': 'Keresés, szűrés, rendezés'
  ,'Use these controls to quickly find habits by name, type, and order.': 'Ezekkel gyorsan kereshetsz név, típus és sorrend szerint.'
  ,'Today progress overview': 'Mai haladás áttekintése'
  ,'This strip tracks completed habits versus total habits visible for today.': 'Ez a sáv a mai teljesített és összes látható szokást mutatja.'
  ,'Quick logging area': 'Gyors naplózás'
  ,'Log instantly from cards: Done for binary habits, plus/minus for numeric goals, and swipe actions.': 'Naplózz azonnal a kártyákról: kész gombbal, plusz/mínusz lépésekkel vagy húzással.'
  ,'One-tap logging': 'Naplózás egy koppintással'
  ,'Tap the primary button on each card to mark binary habits done in a second.': 'A kártya fő gombjával egy pillanat alatt teljesítheted az igen/nem szokásokat.'
  ,'Quick increments': 'Gyors növelés'
  ,'Use the + buttons or "More" to log numeric amounts without leaving the dashboard.': 'A + gombokkal vagy a További műveletekkel az áttekintő elhagyása nélkül naplózhatsz mennyiséget.'
  ,'Habits tab': 'Szokások lap'
  ,'Open Habits to browse everything you track and manage each habit.': 'A Szokások lapon mindent áttekinthetsz és kezelhetsz, amit követsz.'
  ,'Reports tab': 'Kimutatások lap'
  ,'Reports transforms your logs into trend and consistency insights.': 'A Kimutatások a naplóidból trendeket és következetességi adatokat készít.'
  ,'Review completion rates, streak momentum, and habits that need attention.': 'Tekintsd át a teljesítési arányt, a sorozatok lendületét és a figyelmet igénylő szokásokat.'
  ,'Settings tab': 'Beállítások lap'
  ,'Settings lets you control appearance, reminders, and profile details.': 'A Beállításokban kezelheted a megjelenést, az emlékeztetőket és a profiladatokat.'
  ,'Replay tutorial later': 'Bemutató újraindítása később'
  ,'If you want another guided run, reopen this full tour from Settings.': 'Ha újra végigmennél az útmutatón, indítsd el a Beállításokból.'
  ,'Habit setup form': 'Szokás beállító űrlap'
  ,'Define title, habit type, period, and optional target values before saving.': 'Mentés előtt add meg a nevet, a típust, az időszakot és az opcionális célértékeket.'
  ,'Reminder options': 'Emlékeztető beállításai'
  ,'Enable reminders, choose time/day pattern, and optionally keep reminders persistent.': 'Kapcsold be az emlékeztetőt, válassz időpontot és napokat, és igény szerint tedd tartóssá.'
  ,'Habit reminders': 'Szokásemlékeztetők'
  ,'Enable reminders when creating habits so you never miss a streak.': 'Szokás létrehozásakor állíts be emlékeztetőt, hogy ne szakadjon meg a sorozatod.'
  ,'Stay on track': 'Maradj jó úton'
  ,'Scheduled reminders for your habits.': 'Ütemezett emlékeztetők a szokásaidhoz.'
  ,'SMART goal': 'SMART cél'
  ,'Specific - Measurable - Achievable - Relevant - Time-bound': 'Konkrét – Mérhető – Elérhető – Releváns – Időhöz kötött'
  ,'Clarify what success looks like with measurable targets and a timeline.': 'Tisztázd a sikert mérhető célokkal és határidővel.'
  ,'WOOP': 'WOOP'
  ,'Visualize your Wish, Outcome, Obstacles, and if-then Plan to stay resilient.': 'Képzeld el a kívánságot, az eredményt, az akadályokat és a ha–akkor tervet.'
  ,'OKR': 'OKR'
  ,'OKR Snapshot': 'OKR áttekintés'
  ,'Connect daily habits to a larger Objective and measurable Key Result.': 'Kapcsold a napi szokásokat egy nagyobb célkitűzéshez és mérhető kulcseredményhez.'
  ,'Tiny Habit': 'Apró szokás'
  ,'Anchor a tiny version of your habit to an existing routine for easy wins.': 'Kapcsold a szokás apró változatát egy meglévő rutinhoz a könnyű sikerekért.'
  ,'Track only': 'Csak követés'
  ,'Skip structured frameworks and just log progress.': 'Hagyd ki a módszereket, és egyszerűen naplózd a haladást.'
  ,'Chain link added.': 'A lánckapcsolat hozzáadva.'
  ,'Chain link removed.': 'A lánckapcsolat eltávolítva.'
  ,'Select a habit to link.': 'Válassz egy kapcsolandó szokást.'
  ,'Finish': 'Befejezés'
  ,'Notification permission granted. Daily motivation and habit reminders can be scheduled.': 'Az értesítési engedély megadva. A napi motiváció és a szokásemlékeztetők ütemezhetők.'
  ,'Notification permission is blocked. Enable notifications for StriveUp in browser or app settings.': 'Az értesítések le vannak tiltva. Engedélyezd őket a böngésző vagy az alkalmazás beállításaiban.'
  ,'Motivational mode enabled. Daily motivation notifications and startup Goal Compass are active.': 'A motivációs mód bekapcsolva. A napi értesítések és az indítási Céliránytű aktív.'
  ,'Motivational mode enabled. Startup Goal Compass is active, but notifications require permission.': 'A motivációs mód bekapcsolva. A Céliránytű aktív, az értesítésekhez azonban engedély szükséges.'
  ,'Daily motivation notifications are blocked. Tap "Request permission" and allow notifications for StriveUp.': 'A napi motivációs értesítések le vannak tiltva. Koppints az Engedély kérése gombra, majd engedélyezd őket.'
  ,'Motivational mode disabled. Daily motivation notifications and startup Goal Compass are off.': 'A motivációs mód kikapcsolva. A napi értesítések és az indítási Céliránytű inaktív.'
  ,'Goal Compass was not saved. Fill in goal name and every field.': 'A Céliránytű nem lett mentve. Töltsd ki a cél nevét és minden mezőt.'
  ,'Goal Compass updated. Spinner animation now uses your new goal.': 'A Céliránytű frissítve. Az animáció már az új célodat használja.'
  ,'Goal Compass cleared. Startup spinner is hidden until values are saved again.': 'A Céliránytű törölve. Az indítási animáció újabb mentésig rejtve marad.'
  ,'Deep Work Sessions': 'Mélymunka alkalmak'
  ,'Morning Meditation': 'Reggeli meditáció'
  ,'Accomplish focused work sessions 3 times a week.': 'Végezz fókuszált munkát hetente három alkalommal.'
  ,'Hydration Boost': 'Több folyadék'
  ,'Drink 8 glasses of water throughout the day.': 'Igyál meg 8 pohár vizet a nap folyamán.'
  ,'Spend 10 minutes focusing on breath before starting the day.': 'A nap kezdete előtt figyelj 10 percig a légzésedre.'
  ,'Career': 'Karrier'
  ,'Health': 'Egészség'
  ,'Wellness': 'Jóllét'
  ,'Encountered log write conflict that could not be resolved automatically.': 'Naplózási ütközés történt, amelyet nem sikerült automatikusan feloldani.'
  ,'Invalid import file.': 'Érvénytelen importfájl.'
  ,'glasses': 'pohár'
  ,'minutes': 'perc'
  ,'pages': 'oldal'
  ,'kilometers': 'kilométer'
};

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly languageSignal = signal<AppLanguage>(this.readLanguage());
  readonly language = this.languageSignal.asReadonly();
  private root?: HTMLElement;
  private observer?: MutationObserver;
  private readonly originals = new WeakMap<Node, string>();
  private readonly attributeOriginals = new WeakMap<Element, Map<string, string>>();

  constructor() {
    this.applyDocumentLanguage();
    this.syncAndroidLanguage(this.languageSignal());
  }

  setLanguage(language: AppLanguage): void {
    if (language !== 'hu' && language !== 'en') return;
    this.languageSignal.set(language);
    try { localStorage.setItem(STORAGE_KEY, language); } catch { /* Storage may be unavailable. */ }
    this.applyDocumentLanguage();
    this.translateTree();
    this.syncAndroidLanguage(language);
  }

  connect(root: HTMLElement): void {
    this.root = root;
    this.translateTree();
    this.observer?.disconnect();
    this.observer = new MutationObserver(() => this.translateTree());
    this.observer.observe(root, { childList: true, subtree: true, characterData: true });
  }

  disconnect(): void {
    this.observer?.disconnect();
    this.observer = undefined;
  }

  translate(source: string): string {
    return this.translateFor(source, this.languageSignal());
  }

  private translateFor(source: string, language: AppLanguage): string {
    if (language === 'en') return source;
    const leading = source.match(/^\s*/)?.[0] ?? '';
    const trailing = source.match(/\s*$/)?.[0] ?? '';
    const value = source.trim();
    if (!value) return source;
    const exact = HU[value];
    if (exact) return `${leading}${exact}${trailing}`;

    const patterns: Array<[RegExp, (...parts: string[]) => string]> = [
      [/^Streak:\s*(\d+) days?$/, n => `Sorozat: ${n} nap`],
      [/^(\d+) completed$/, n => `${n} teljesítve`],
      [/^(\d+) left today$/, n => `${n} van hátra mára`],
      [/^Today:\s*(\d+)\s*\/\s*(\d+) completed$/, (a, b) => `Ma: ${a} / ${b} teljesítve`],
      [/^Created (.+)$/, date => `Létrehozva: ${date}`],
      [/^Logged (.+)$/, time => `Naplózva: ${time}`],
      [/^(\d+) check-ins$/, n => `${n} alkalom`],
      [/^Every (.+)$/, value => `Minden ${value}`]
      ,[/^Decrease (\d+) (.+) · (.+)$/, (amount, unit, habit) => `${this.translateFor(habit, 'hu')} csökkentése ${amount} ${this.translateFor(unit, 'hu')}`]
      ,[/^Add (\d+) (.+) · (.+)$/, (amount, unit, habit) => `${this.translateFor(habit, 'hu')} növelése ${amount} ${this.translateFor(unit, 'hu')}`]
      ,[/^Decrease (.+)$/, habit => `${this.translateFor(habit, 'hu')} csökkentése`]
      ,[/^Toggle (.+)$/, habit => `${habit} átkapcsolása`]
      ,[/^Done, habit: (.+)$/, habit => `Kész, szokás: ${habit}`]
      ,[/^Undo, habit: (.+)$/, habit => `Visszavonás, szokás: ${habit}`]
      ,[/^(.+) progress$/, label => `${label} haladása`]
      ,[/^(.+) progress (\d+) of (\d+)$/, (label, value, total) => `${this.translateFor(label, 'hu')} haladása: ${value} / ${total}`]
      ,[/^(.+) bar chart$/, label => `${label} oszlopdiagram`]
      ,[/^Step (\d+) \/ (\d+)$/, (step, total) => `${step}. lépés / ${total}`]
      ,[/^Failed to (.+)$/, action => `Nem sikerült: ${action}`]
      ,[/^Unknown error (.+)$/, action => `Ismeretlen hiba: ${action}`]
    ];
    for (const [pattern, replacement] of patterns) {
      const match = value.match(pattern);
      if (match) return `${leading}${replacement(...match.slice(1))}${trailing}`;
    }
    return source;
  }

  private translateTree(): void {
    if (!this.root) return;
    this.observer?.disconnect();
    const walker = document.createTreeWalker(this.root, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const current = node.textContent ?? '';
      const previousOriginal = this.originals.get(node);
      const previousTranslation = previousOriginal === undefined ? undefined : this.translateFor(previousOriginal, 'hu');
      if (previousOriginal === undefined || current !== previousTranslation) this.originals.set(node, current);
      node.textContent = this.translateFor(this.originals.get(node) ?? current, this.languageSignal());
    }
    for (const element of Array.from(this.root.querySelectorAll<HTMLElement>('*'))) {
      const stored = this.attributeOriginals.get(element) ?? new Map<string, string>();
      for (const attribute of ['placeholder', 'aria-label', 'title', 'alt']) {
        const current = element.getAttribute(attribute);
        if (current === null) continue;
        const original = stored.get(attribute);
        const priorTranslation = original === undefined ? undefined : this.translateFor(original, 'hu');
        if (original === undefined || current !== priorTranslation) stored.set(attribute, current);
        element.setAttribute(attribute, this.translateFor(stored.get(attribute) ?? current, this.languageSignal()));
      }
      this.attributeOriginals.set(element, stored);
    }
    this.observer?.observe(this.root, { childList: true, subtree: true, characterData: true });
  }

  private readLanguage(): AppLanguage {
    try { return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'hu'; } catch { return 'hu'; }
  }

  private applyDocumentLanguage(): void {
    if (typeof document !== 'undefined') document.documentElement.lang = this.languageSignal();
  }

  private syncAndroidLanguage(language: AppLanguage): void {
    if (Capacitor.getPlatform() !== 'android') return;
    void DailyLessons.setLanguage({ language }).catch(error =>
      console.warn('Unable to update the Android language.', error)
    );
  }
}
