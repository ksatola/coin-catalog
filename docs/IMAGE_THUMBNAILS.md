# Ustalenia — miniaturki zdjęć monet

Data: 2026-10-01

Ten dokument zapisuje ustalenia z rozmowy dotyczącej optymalizacji wyświetlania zdjęć monet. Opisuje wyłącznie ustalenia, które zostały omówione i zaakceptowane. Nie jest opisem wykonanej implementacji.

## Zakres

Ustalony kierunek optymalizacji obejmuje:

1. Miniaturki zdjęć monet.
2. Lazy loading.
3. Kontrolę cache oraz unieważnianie cache po zmianie zdjęcia monety.
4. Zachowanie mechanizmu retry również dla miniaturek.
5. Zarządzanie miniaturkami przez program oraz sprawdzanie, czy miniaturki istnieją i są aktualne.

## Miniaturki

Miniaturki mają być generowane w dobrej jakości.

Na początek przyjmujemy parametry:

- maksymalny wymiar dłuższego boku: **800 px**,
- jakość JPEG: **90**,
- zachowanie proporcji,
- bez cropowania,
- wynik zawsze w formacie **JPG**.

Parametr maksymalnego wymiaru ma pozostać konfigurowalny, aby można było później łatwo zmienić wartość 800 px.

Oryginalne zdjęcie jest źródłem prawdy. Miniaturka jest wyłącznie jego pochodną i **oryginał nie może być modyfikowany podczas generowania miniaturki**.

Jeżeli miniaturka zostanie usunięta albo przestanie być aktualna, program powinien móc ją odtworzyć na podstawie oryginału.

## Lazy loading

Zdjęcia w widokach katalogu mają korzystać z lazy loadingu, tak aby przeglądarka nie musiała od razu ładować wszystkich zdjęć dostępnych w katalogu.

## Cache i revision

Miniaturki mają korzystać z cache.

Do wersjonowania obrazu i unieważniania cache przyjmujemy **revision** na `CoinImage`.

Nowe zdjęcie otrzymuje początkową revision. Przy podmianie oryginalnego zdjęcia revision jest zwiększana.

Revision ma służyć do rozróżniania kolejnych wersji tego samego obrazu, np. w adresie miniaturki. Dzięki temu po podmianie zdjęcia przeglądarka otrzymuje nowy adres zasobu i nie korzysta ze starej wersji miniaturki z cache.

Zmiana danych monety, która nie zmienia zdjęcia, nie wymaga zmiany revision obrazu ani unieważnienia cache jego miniaturki.

Aktualność miniaturki ma uwzględniać revision obrazu.

## Retry i błędy generowania

Obecny mechanizm retry dla zdjęć ma zostać zachowany.

Po wprowadzeniu miniaturek retry ma działać również dla miniaturek.

Podczas generowania miniaturki program ma ponowić próbę w przypadku błędu. Jeżeli druga próba również się nie powiedzie, użytkownik ma otrzymać komunikat, a program ma ponownie spróbować wygenerować miniaturkę przy renderowaniu widoku monety.

## Sprawdzanie i regeneracja miniaturek

Katalog korzysta z infinite scroll. Jednorazowo pobierany jest zakres **50 monet**.

Kontrola miniaturek ma być wykonywana dla aktualnie pobieranego zakresu 50 monet. Nie ma potrzeby wykonywania pełnego skanowania całego katalogu przy każdym takim pobraniu.

Program ma sprawdzać dla używanych zdjęć, czy odpowiednie miniaturki:

- istnieją,
- są poprawnym JPG,
- mają prawidłowe wymiary,
- odpowiadają aktualnej revision oryginalnego obrazu,
- odpowiadają aktualnej wersji parametrów/generatora miniaturek.

Brakująca lub nieaktualna miniaturka powinna zostać wygenerowana ponownie na podstawie oryginału.

Mechanizm kontroli powinien móc obsłużyć dowolny zestaw obrazów, ale normalna ścieżka katalogu przekazuje mu obrazy aktualnie pobranych monet. Nie ustalamy pełnego skanowania całej biblioteki jako elementu normalnego renderowania katalogu.

## Układ folderów

Zaakceptowany został pierwszy wariant układu folderów: obecny układ oryginalnych zdjęć pozostaje bez zmian, a miniaturki dostają osobny katalog `thumbnails`.

Docelowy układ:

```text
images/
├── collection-001/
│   ├── 000001 - avers.jpg
│   ├── 000001 - rewers.jpg
│   ├── 000002 - avers.jpg
│   └── ...
├── collection-002/
│   └── ...
└── thumbnails/
    ├── collection-001/
    │   ├── 000001 - avers.jpg
    │   ├── 000001 - rewers.jpg
    │   ├── 000002 - avers.jpg
    │   └── ...
    └── collection-002/
        └── ...
```

Miniaturki zachowują ten sam basename co odpowiadające im oryginały.

Przykład:

```text
images/collection-001/000123 - avers.jpg
images/thumbnails/collection-001/000123 - avers.jpg
```

## Użycie miniaturek i oryginałów

Miniaturki są używane w widokach katalogowych:

- Gallery — **miniaturka**,
- Grid — **miniaturka**,
- Size Gallery — **miniaturka**.

W miejscach, gdzie użytkownik potrzebuje pełnego obrazu, pozostaje używany oryginał:

- szczegóły monety — **oryginał**,
- edycja monety — **oryginał**.

## Wersja generatora miniaturek

Aktualność miniaturki ma uwzględniać nie tylko revision obrazu, ale również aktualną wersję parametrów/generatora miniaturek.

Zmiana parametrów generowania w przyszłości ma umożliwiać rozpoznanie starszych miniaturek jako nieaktualnych i ich ponowne wygenerowanie.

Nie ustalono jeszcze konkretnego sposobu przechowywania tej wersji ani konkretnego mechanizmu implementacyjnego.
