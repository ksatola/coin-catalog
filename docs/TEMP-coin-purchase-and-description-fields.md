# Tymczasowy zakres — pola opisu i nabycia monety

## Branch

`feature/coin-purchase-and-description-fields`

## Cel

Rozszerzyć model monety o opis awersu/rewersu, literaturę oraz hybrydowy mechanizm sposobu nabycia. Jednocześnie zmienić datowanie tak, aby całość była opcjonalna.

## Ustalenia zaakceptowane

### Wymagane pola API przy tworzeniu monety

Wymagane pozostają wyłącznie:

- `collection_id` — Kolekcja
- `country_id` — Kraj
- `denomination_id` — Nominał

Całe datowanie jest opcjonalne:

- `from_year` — Rok od
- `from_era_id` — Era od
- `to_year` — Rok do
- `to_era_id` — Era do

Pozostałe istniejące pola zachowują obecny status opcjonalny.

### Obecne wymaganie UI

Aktualny formularz frontendowy wymaga również zdjęcia awersu i rewersu przy zapisie. Nie zmieniamy tego zachowania w ramach tego zadania, chyba że zostanie osobno uzgodnione.

### Nowe pola tekstowe

Dodajemy trzy opcjonalne pola tekstowe:

- `avers_description` — Awers
- `revers_description` — Rewers
- `literature` — Literatura


### Sposób nabycia

Dodajemy hybrydowy mechanizm:

- użytkownik może wpisać dowolny tekst (free text),
- może wybrać istniejącą wartość ze słownika,
- może dodać nową wartość do słownika z formularza,
- powtarzające się wartości, np. dom aukcyjny, mogą być reprezentowane jednym rekordem słownikowym.

Szczegółowy model danych słownika zostanie ustalony podczas implementacji po sprawdzeniu istniejącej infrastruktury słowników.

## Zakres implementacji

### Backend

- zmiana modelu `Coin`,
- aktualizacja schematów create/update/response,
- zmiana wymagalności pól datowania,
- dodanie obsługi słownika sposobów nabycia,
- API wyboru/dodawania wartości sposobu nabycia,
- obsługa nowych pól w CRUD monety,
- zachowanie nowych danych podczas przenoszenia monety między kolekcjami,
- nowa migracja Alembic.

### Frontend

- pola tekstowe Awers, Rewers i Literatura,
- hybrydowe pole Sposób nabycia,
- wybór wartości ze słownika,
- dodawanie nowej wartości do słownika bez opuszczania formularza,
- usunięcie wymagalności pól datowania w formularzu,
- prezentacja zapisanych wartości w widoku szczegółów monety.

### Testy backend

- create/read/update/clear nowych pól,
- zapis monety bez danych datowania,
- CRUD sposobu nabycia,
- wybór wartości słownikowej,
- dodanie nowej wartości,
- free text,
- zachowanie danych po przeniesieniu monety.

### Testy frontend / Playwright

- zapis i edycja Awers/Rewers/Literatura,
- zapis bez datowania,
- wybór istniejącego sposobu nabycia,
- dodanie nowego sposobu nabycia,
- wpisanie własnego tekstu,
- odczyt zapisanych danych.

### Dokumentacja

Po implementacji i weryfikacji:

- zaktualizować odpowiednią dokumentację architektury/decisions, jeśli zmiana wymaga trwałej decyzji,
- zaktualizować `docs/PROGRESS.md` wyłącznie o faktycznie zweryfikowane elementy,
- usunąć ten tymczasowy plik po zakończeniu prac, jeśli nie będzie już potrzebny.

## Poza zakresem

Nie dodajemy na tym etapie:

- dodatkowych pól provenance,
- typów/odmian,
- numerów katalogowych,
- nakładu,
- próby metalu,
- grubości,
- opisu rantu,
- osobnych legend awersu/rewersu.

## Status

- [x] Zakres uzgodniony
- [x] Branch utworzony
- [x] Tymczasowy zakres zapisany w repozytorium 
- [ ] Implementacja backendu
- [ ] Migracja bazy
- [ ] Implementacja frontendu
- [ ] Testy backendu
- [ ] Testy Playwright
- [ ] Weryfikacja całości
- [ ] Aktualizacja dokumentacji
- [ ] Usunięcie pliku tymczasowego
