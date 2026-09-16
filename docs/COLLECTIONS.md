# Collections

## Domain Model

Jedna wspólna baza SQLite:

```text
collection
-----------
id
name
description
created_at
updated_at

coin
-----------
id
collection_id → collection.id
collection_number
...
```

Czyli:

- **jedna baza danych** dla całego katalogu,
- jedna `coin` nadal oznacza **jeden fizyczny egzemplarz**,
- każdy coin należy do **dokładnie jednej kolekcji**,
- `collection_number` pozostaje numerem użytkowym konkretnego coina,
- kolekcja dostaje własne `id`, nazwę i opcjonalny opis,
- przeniesienie coina między kolekcjami będzie zwykłą zmianą `collection_id`,
- istniejące coiny dostaną jedną domyślną kolekcję podczas migracji, żeby nie komplikować kompatybilności.

## Collection Selection

Formularze tworzenia i edycji monety mają pole wyboru kolekcji:

```text
Collection: [ My Roman Coins ▼ ]
```

Zasady UI:

- przy tworzeniu monety użytkownik wybiera dokładnie jedną kolekcję,
- przy edycji monety użytkownik może zmienić przypisaną kolekcję,
- w formularzu edycji użytkownik może utworzyć nową kolekcję bez opuszczania formularza i następnie przypisać ją do monety,
- widok szczegółów monety jest **read-only**: pokazuje przypisaną kolekcję, ale nie pozwala jej zmieniać ani tworzyć kolekcji,
- nazwa przypisanej kolekcji w szczegółach monety może prowadzić do widoku tej kolekcji.

Dla istniejących monet po wprowadzeniu kolekcji utworzymy jedną domyślną kolekcję, np. `Default Collection`, i przypiszemy do niej obecne rekordy.

## Collection UI Scope

Kolekcje są pełnoprawnym elementem UI i powinny mieć **analogiczne umiejscowienie oraz funkcjonalny scope do kategorii**. Nie należy traktować kolekcji jako wyłącznie pola technicznego w formularzu monety.

### Navigation

- `Collections` jest dostępne w głównej nawigacji na analogicznym poziomie jak `Categories`,
- użytkownik może wejść bezpośrednio do listy kolekcji,
- użytkownik może wejść z monety do jej kolekcji.

### Collection List / Management

Widok kolekcji zapewnia:

- listę kolekcji,
- utworzenie kolekcji,
- edycję kolekcji,
- usunięcie pustej kolekcji,
- statystyki kolekcji,
- przejście do monet należących do kolekcji.

Zasady usuwania wynikają z domeny: kolekcji zawierającej monety nie można usunąć.

### Coin List

Na ekranie monet kolekcja jest filtrem na równi z istniejącymi filtrami, w szczególności z kategoriami. Filtr kolekcji jest multi-select zgodnie z sekcją `Collection Search`.

Lista monet powinna również prezentować przypisaną kolekcję w miejscach, w których użytkownik potrzebuje kontekstu kolekcji.

### Coin Detail

Szczegóły monety pokazują:

```text
Collection: My Roman Coins
```

Jest to informacja **read-only**.

Na tym ekranie:

- można zobaczyć, do której kolekcji należy moneta,
- można przejść do widoku kolekcji,
- **nie można zmienić przypisania**,
- **nie można utworzyć kolekcji**.

### Coin Edit

Ekran edycji monety zapewnia pełny workflow przypisania kolekcji:

- pokazuje aktualnie przypisaną kolekcję,
- pozwala wybrać inną istniejącą kolekcję,
- pozwala utworzyć nową kolekcję bez opuszczania formularza,
- po utworzeniu nowa kolekcja może zostać przypisana do edytowanej monety.

Ten workflow powinien być rozwiązany analogicznie do istniejącego workflow kategorii.

### Coin Create

Ekran tworzenia monety:

- wymaga wyboru dokładnie jednej kolekcji,
- pozwala wybrać istniejącą kolekcję,
- pozwala utworzyć nową kolekcję bez opuszczania formularza, analogicznie do kategorii.

## Moving a Coin Between Collections

**Tak, zdecydowanie.**

Nie traktowałbym tego jako specjalnej operacji bazodanowej. Z punktu widzenia domeny:

```text
Coin #123
Collection A
      │
      │ Move to Collection B
      ▼
Collection B
```

Zmienia się `coin.collection_id`.

Natomiast **fizyczne JPG również powinny zostać przeniesione**, jeśli przyjmiemy organizację:

```text
data/
└── images/
    ├── collection-a/
    │   └── coin-123/
    │       ├── obverse.jpg
    │       └── reverse.jpg
    │
    └── collection-b/
```

Po przeniesieniu:

```text
data/
└── images/
    └── collection-b/
        └── coin-123/
            ├── obverse.jpg
            └── reverse.jpg
```

Ale tutaj zrobiłbym ważne rozróżnienie:

**operacja "przenieś monetę" powinna być atomową operacją aplikacyjną** — najpierw poprawnie przenieść/zmienić referencje do plików, a dopiero potem zatwierdzić zmianę `collection_id`, albo mieć bezpieczny mechanizm rollbacku w przypadku błędu filesystemu.

Nie chcemy sytuacji:

```text
DB → Collection B
JPG → nadal Collection A
```

## Collection Search

**Tak. I zrobiłbym to od początku w modelu.**

Nie ograniczałbym wyszukiwania do:

```text
Collection: [one collection]
```

tylko filtr byłby wielokrotnego wyboru:

```text
Collections:
☑ Roman
☑ Greek
☐ Polish
☐ Medieval
```

Wtedy wyniki oznaczają:

```text
WHERE coin.collection_id IN (Roman, Greek)
```

Czyli można:

- oglądać jedną kolekcję,
- wybrać kilka kolekcji,
- wybrać wszystkie,
- wyszukiwać bez ograniczenia kolekcji.

To dobrze współgra z obecnym mechanizmem wyszukiwania i filtrowania.

## File System

Docelowo:

```text
data/
├── coin-catalog.db
└── images/
    ├── collection-001/
    │   ├── 000404 - awers.jpg
    │   ├── 000404 - rewers.jpg
    │   ├── 000405 - awers.jpg
    │   └── ...
    └── collection-002/
        ├── 000001 - awers.jpg
        └── ...
```

Czyli **tylko jeden poziom podfolderów dla kolekcji**. Wewnątrz kolekcji nie tworzymy folderów dla poszczególnych monet. Obecny system nazewnictwa plików zostaje zachowany.

## Moving a Coin and File Renaming

Jeżeli coin `id=404` zostaje przeniesiony z `collection-001` do `collection-002`, **nie zachowujemy jego dotychczasowego ID**.

Tworzymy nowy rekord, np.:

```text
collection-001
    coin id=404
        000404 - awers.jpg
        000404 - rewers.jpg

             ↓ MOVE

collection-002
    coin id=731
        000731 - awers.jpg
        000731 - rewers.jpg
```

Czyli operacja obejmuje jednocześnie:

1. utworzenie nowego `coin.id` w kolekcji docelowej,
2. przeniesienie danych monety,
3. przeniesienie jej zdjęć,
4. zmianę nazw JPG zgodnie z nowym ID,
5. aktualizację rekordów `coin_image`,
6. usunięcie starego rekordu/plików źródłowych,
7. ochronę przed kolizją nazw w kolekcji docelowej.

W efekcie **ID monety jest unikalne w skali całej bazy**, ale fizyczna numeracja/nazwa plików jest związana z konkretnym rekordem.

Jeżeli w kolekcji docelowej istnieje już np. `000731 - awers.jpg`, proces nie może go nadpisać. Nowy ID musi być dobrany tak, żeby zestaw nazw plików był bezkolizyjny.

## Collection Number

`collection_number`:

- zachowujemy podczas przenoszenia,
- może być zmieniona ręcznie w UI,
- jest całkowicie kontrolowana manualnie przez end usera,
- nie jest generowana automatycznie przez system,
- jest niezależna od technicznego `coin.id`.

Przyjęcie przez Ciebie SQL `coin.id` jako źródła nowego ID jest sensowne. **Nie tworzyłbym osobnego generatora numerów dla kolekcji** — SQLite pozostaje źródłem technicznej tożsamości coina, a `collection_number` jest całkowicie niezależną, ręcznie zarządzaną wartością użytkownika.

## Collection Rules

- nazwa kolekcji musi być unikalna,
- można utworzyć pustą kolekcję,
- nie można usunąć kolekcji zawierającej monety; najpierw trzeba je przenieść,
- kategorie są wspólne dla wszystkich kolekcji,
- wszystkie istniejące `coin_image` są przenoszone razem z monetą, niezależnie od rodzaju (`avers`, `rewers`, `additional`).

## Atomic Move Operation

Przyjmujemy, że **przeniesienie monety jest operacją transakcyjną z mechanizmem rollbacku**. Stan źródłowy pozostaje nienaruszony aż do momentu, gdy cały nowy stan zostanie skutecznie przygotowany.

Przykładowo:

```text
collection-001
  coin 404
  000404 - awers.jpg
  000404 - rewers.jpg

             │
             │ MOVE
             ▼

collection-002
  nowy coin ID 731
  000731 - awers.jpg
  000731 - rewers.jpg
```

### Warunek sukcesu

Operacja może usunąć:

```text
coin 404
stare JPG
```

**dopiero wtedy**, gdy wszystkie poniższe rzeczy zakończą się sukcesem:

1. wygenerowano nowe ID,
2. utworzono nowy rekord `coin`,
3. utworzono odpowiednie rekordy `coin_image`,
4. wszystkie JPG zostały skopiowane/przeniesione do `images/collection-002/`,
5. nadano im nowe nazwy,
6. sprawdzono, że pliki docelowe istnieją i nie kolidują,
7. transakcja bazodanowa może zostać zatwierdzona.

### W przypadku błędu

Wracamy do stanu sprzed operacji:

```text
collection-001
  coin 404
  000404 - awers.jpg
  000404 - rewers.jpg

collection-002
  brak nowego coina
  brak częściowo przeniesionych JPG
```

Czyli nie może zostać ani:

```text
coin w B + stare JPG w A
```

ani:

```text
coin w A + JPG w B
```

ani tym bardziej częściowo utworzony rekord albo częściowo skopiowany zestaw zdjęć.

### Technical Requirement

SQLite potrafi zapewnić atomowość **transakcji bazodanowej**, ale system plików nie uczestniczy automatycznie w tej samej transakcji. Dlatego nie możemy po prostu zrobić:

```text
BEGIN
  INSERT coin
  move JPG
  COMMIT
```

i uznać, że mamy gwarantowany rollback wszystkiego.

Potrzebujemy świadomie zaprojektowanego **two-phase filesystem/database operation** z tymczasowymi nazwami/plikami i procedurą kompensującą. Szczególnie ważne będzie, żeby awaria procesu w dowolnym momencie nie pozostawiła niejednoznacznego stanu.

To oznacza, że w decyzji architektonicznej warto zapisać nie tylko „move coin”, ale również wymaganie:

> **A coin move must be atomic from the user's perspective and must provide rollback/compensation for both database and filesystem changes.**

## Integrity Invariant

Po każdej zakończonej operacji przeniesienia powinno być możliwe sprawdzenie:

```text
dla każdego CoinImage:
    coin istnieje
    wskazany plik istnieje
    plik znajduje się w katalogu właściwym dla kolekcji coina
    filename odpowiada rzeczywistej nazwie pliku
```

To można później wykorzystać również jako **integrity check** aplikacji, nie tylko jako test.

# Test Strategy

Testy należy podzielić na **warstwy**, bo sama poprawność `collection_id` nie wystarczy — najtrudniejszym elementem jest spójność DB + filesystemu podczas przenoszenia.

## 1. Model i baza danych

**Collections**
- utworzenie kolekcji,
- nazwa kolekcji jest unikalna,
- można utworzyć pustą kolekcję,
- kolekcja może zawierać wiele monet,
- nie można usunąć kolekcji zawierającej monety,
- można usunąć pustą kolekcję.

**Coins**
- każda nowa moneta wymaga kolekcji,
- `collection_id` wskazuje istniejącą kolekcję,
- coin może zostać przeniesiony do innej kolekcji,
- `collection_number` pozostaje niezmieniony podczas przeniesienia,
- ręczna zmiana `collection_number` nadal działa.

## 2. Wyszukiwanie

Tu zrobiłbym kilka kombinacji:

```text
1 kolekcja → wyniki tylko z niej
2 kolekcje → wyniki z obu
3 z 5 kolekcji → wyniki tylko z wybranych
wszystkie → wyniki ze wszystkich
brak filtra kolekcji → wszystkie
kolekcja + tekst → oba filtry działają jednocześnie
kolekcja + pozostałe filtry → AND między filtrami
```

Szczególnie ważny jest przypadek, w którym ta sama fraza występuje w monetach z różnych kolekcji.

## 3. Pliki

Dla normalnego dodawania/edycji:

- JPG trafia do `images/collection-001/`,
- nazwa pozostaje zgodna z obecnym systemem,
- nie są tworzone podfoldery coinów,
- `coin_image.filename` odpowiada faktycznemu plikowi,
- wiele zdjęć jednej monety działa poprawnie,
- `avers`, `rewers`, `additional` zachowują swoje metadane.

## 4. Przeniesienie — happy path

To powinien być osobny, mocny zestaw testów.

Przykład:

```text
Collection A
  coin 100
  00100 - awers.jpg
  00100 - rewers.jpg

Collection B
  coin 200
```

Po przeniesieniu:

```text
Collection A
  brak coin 100

Collection B
  coin 201       ← nowe SQL ID
  00201 - awers.jpg
  00201 - rewers.jpg
```

Test powinien sprawdzić **cały stan**, a nie tylko HTTP 200:

- nowe ID ≠ stare ID,
- nowy coin ma poprawne dane,
- `collection_id` wskazuje kolekcję B,
- `collection_number` jest taki sam,
- wszystkie `coin_image` wskazują nowy coin,
- wszystkie nowe JPG istnieją,
- stare JPG nie istnieją,
- starego rekordu nie ma,
- w docelowej kolekcji nie ma kolizji nazw.

## 5. Przeniesienie z kolizją nazw

To jest bardzo ważny test.

Jeżeli:

```text
Collection B/
    00201 - awers.jpg
```

już istnieje, przenoszony coin **nie może go nadpisać**.

Test powinien potwierdzić:

- istniejący plik pozostaje nietknięty,
- generowane jest inne ID,
- nowe JPG mają inne nazwy,
- nowy coin wskazuje właśnie te nowe pliki,
- źródłowy coin pozostaje niezmieniony, jeśli operacja nie może zostać bezpiecznie zakończona.

## 6. Rollback — najważniejsza grupa

Tutaj celowo wymuszamy błędy.

Osobne testy dla awarii:

- utworzenia nowego rekordu DB,
- kopiowania pierwszego JPG,
- kopiowania kolejnego JPG,
- zmiany nazwy pliku,
- utworzenia rekordu `coin_image`,
- finalizacji transakcji DB,
- problemu z plikiem docelowym.

Po **każdym** błędzie sprawdzamy:

```text
DB:
  stary coin istnieje
  nowy coin nie istnieje
  stare coin_image istnieją
  nowe coin_image nie pozostają

Filesystem:
  stare JPG istnieją
  ich zawartość się nie zmieniła
  niedokończone nowe JPG nie pozostają
```

To jest właściwy test atomowości.

## 7. Awaria po częściowym sukcesie

Jeszcze mocniejszy wariant:

```text
JPG 1 → przeniesiony
JPG 2 → przeniesiony
JPG 3 → ERROR
```

Rollback musi usunąć **JPG 1 i JPG 2**, przywracając stan początkowy.

Analogicznie:

```text
DB INSERT → sukces
JPG → sukces
kolejny krok → ERROR
```

Nowy rekord DB musi zostać wycofany.

## 8. ID i nazewnictwo

Testowałbym też:

- nowe ID jest generowane przez SQLite,
- nowe ID nie koliduje z istniejącym ID,
- nazwa każdego JPG wynika z nowego ID,
- istniejące pliki w kolekcji docelowej nigdy nie są nadpisywane,
- przeniesienie monety bez zdjęć również działa,
- przeniesienie monety z jednym zdjęciem działa,
- przeniesienie z wieloma zdjęciami działa.

## 9. UI / Playwright

Na poziomie E2E:

**Collections**
- kolekcje są dostępne w głównej nawigacji na analogicznym poziomie jak kategorie,
- użytkownik może utworzyć, edytować i usunąć pustą kolekcję,
- użytkownik może wejść z kolekcji do jej monet,
- statystyki kolekcji są widoczne.

**Create**
- utworzenie kolekcji,
- dodanie monety do wybranej kolekcji,
- możliwość utworzenia kolekcji z poziomu formularza tworzenia monety,
- kolekcja jest widoczna w szczegółach/katalogu.

**Edit**
- zmiana kolekcji,
- możliwość utworzenia kolekcji z poziomu formularza edycji monety,
- nowa kolekcja może zostać przypisana do edytowanej monety,
- `collection_number` pozostaje bez zmian przy zmianie kolekcji.

**Detail**
- szczegóły monety pokazują przypisaną kolekcję,
- przypisana kolekcja jest read-only,
- można przejść do widoku kolekcji,
- nie ma akcji zmiany ani tworzenia kolekcji na ekranie szczegółów.

**Search**
- multi-select kolekcji,
- wyniki zmieniają się poprawnie,
- połączenie wyboru kolekcji z istniejącym search/filter,
- kolekcja i pozostałe filtry działają jako AND.

**Move**
- użytkownik uruchamia przeniesienie,
- potwierdza operację,
- UI pokazuje nowy rekord/ID,
- zdjęcia nadal są dostępne.

**Failure**
- jeśli chcemy to pokryć E2E, można zasymulować błąd backendu i sprawdzić komunikat oraz zachowanie UI. Szczegółowe scenariusze awarii filesystemu lepiej jednak testować na backendzie.

## Proposed Test Structure

```text
backend
├── collection CRUD tests
├── collection/coin relationship tests
├── collection search tests
├── coin move success tests
├── coin move collision tests
├── coin move rollback tests
└── filesystem/database consistency tests

frontend
├── collection navigation/list tests
├── collection selection tests
├── collection creation from coin create/edit tests
├── collection read-only coin detail tests
├── multi-collection search tests
└── coin move E2E tests
```

Najważniejsze jest to, żeby **rollback testy były rzeczywistymi testami awarii**, a nie tylko testem „normalnego przeniesienia”. To właśnie one dadzą nam największą gwarancję, że nie zostawimy użytkownika z rozjechaną bazą i plikami.
