# UFC Beheer — werkafspraken voor Claude

Beheer-app ("backend") voor de floorball-apps van UFC Utrecht. Live op
https://ufcutrecht.github.io/floorball-beheer/ (GitHub Pages, branch `main`, map root).
Alleen voor Remco (GitHub `remcovoort`): zet wijzigingen direct op `main`, zonder branch of pull request.

De oefeningen zelf staan niet hier maar in `ufcutrecht/floorball-training` (zie de CLAUDE.md daar).

## Opbouw

| Pad | Wat |
| --- | --- |
| `index.html` | Startpagina: inloggen, tegels naar de onderdelen, snelle links (scores, apps, reviewlijsten). |
| `filmen/` | "Oefening filmen": filmpjes per opname (lege opstelling, rustige ronde, op tempo, varianten) en een beschrijving per oefening, opgeslagen in Supabase (tabel `film_oefeningen`, besloten opslagbak `filmpjes`). |
| `shared/auth.js` | Inloggen bij Supabase (e-mail en wachtwoord), `FBAuth.api(...)` voor verzoeken met de sessie. Een element met `data-login` krijgt vanzelf het inlogvak. |
| `shared/config.js` | Supabase-adres en publishable key, dezelfde als in floorball-training (mag openbaar). |
| `shared/style.css` | Opmaak, in de kleuren van ufcutrecht.nl (grijze achtergrond, donkere kopbalk met blauwe streep, blauwe links, witte blokken); licht en donker via de variabelen in `:root`. |
| `supabase/filmen.sql` | Database-opzet voor het filmen, met de stappen die je daarna in Supabase doet. |
| `sw.js` | Offline-app. Cachenaam begint met `ufc-beheer-`, want de andere apps op hetzelfde domein ruimen `floorball-…` caches op. Hoog `CACHE` op bij elke wijziging aan html, js of css. |
| `icons/` | UFC-logo met "BEHEER" eronder. |

## Een gefilmde oefening verwerken

Remco plakt de tekst van "Kopieer voor Claude" in de chat: de beschrijving en per filmpje een link
die 7 dagen geldig is. Download de filmpjes met `curl`, haal er beelden uit met `ffmpeg`
(bijvoorbeeld één beeld per 2 seconden) en maak daarmee de oefening in floorball-training,
met tekening, reviewlijst en thema's volgens de CLAUDE.md daar.
Leeftijdsgroepen kunnen meerdere zijn (O10, O12, O14, O18, Gymles groep 3–6, Gymles groep 7–8).

## Testen

Open de gewijzigde pagina's met `python3 -m http.server` en Playwright op ≈400 px en desktop,
controleer dat er geen javascriptfouten zijn en niets breder is dan het scherm, en blokkeer alle
verzoeken naar Supabase (`page.route("**/*.supabase.co/**", lambda r: r.abort())`).

## Niet doen

- Geen sleutels of wachtwoorden in de code behalve de publishable key in `config.js`.
- Geen service-role key gebruiken: alles loopt via de ingelogde gebruiker en de regels in Supabase.
