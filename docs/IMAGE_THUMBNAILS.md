# Ustalenia — miniaturki zdjęć monet

Data: 2026-10-01

Ten dokument zapisuje ustalenia z rozmowy dotyczącej optymalizacji wyświetlania zdjęć monet. Opisuje wyłącznie ustalenia, które zostały omówione i zaakceptowane. Nie jest opisem wykonanej implementacji.

## Zakres

Ustalony kierunek optymalizacji obejmuje:

1. Miniaturki zdjęć monet.
2. Lazy loading.
3. Kontrolę cache oraz unieważnianie cache po edycji monety.
4. Zachowanie mechanizmu retry również dla miniaturek.
5. Zarządzanie miniaturkami przez program oraz sprawdzanie, czy miniaturki istnieją i są aktualne.

## Miniaturki

Miniaturki mają być generowane w dobrej jakości.

Oryginalne zdjęcie pozostaje źródłem, a miniaturka jest jego pochodną. Jeżeli miniaturka zostanie usunięta albo przestanie być aktualna, program powinien móc ją odtworzyć na podstawie oryginału.

## Lazy loading

Zdjęcia w widokach katalogu mają korzystać z lazy loadingu, tak aby przeglądarka nie musiała od razu ładować wszystkich zdjęć dostępnych w katalogu.

## Cache

Miniaturki mają korzystać z cache.

Po edycji monety cache odpowiedniej miniaturki musi zostać unieważniony, tak aby po zmianie zdjęcia użytkownik nie otrzymał starej wersji z cache.

## Retry

Obecny mechanizm retry dla zdjęć ma zostać zachowany.

Po wprowadzeniu miniaturek retry ma działać również dla miniaturek, a nie zostać usunięty.

## Sprawdzanie i regeneracja miniaturek

Katalog korzysta z infinite scroll. Jednorazowo pobierany jest zakres 50 monet.

W związku z tym kontrola miniaturek może być wykonywana dla aktualnie pobieranego zakresu 50 monet, zamiast zakładać konieczność jednoczesnego sprawdzania całego katalogu.

Program ma sprawdzać dla używanych zdjęć, czy odpowiednie miniaturki istnieją i są aktualne. Brakująca lub nieaktualna miniaturka powinna zostać wygenerowana ponownie na podstawie oryginału.

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

Nie ustalono w tej rozmowie dalszych szczegółów dotyczących parametrów generowania miniaturek, sposobu wersjonowania obrazów ani konkretnej implementacji mechanizmu kontroli aktualności. Te kwestie pozostają do dalszego omówienia.
