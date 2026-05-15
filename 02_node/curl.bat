curl -X PUT "http://localhost:5000/lehr-bewertung-schueler/update/45" \
  -H "Content-Type: application/json" \
  -d "{
    \"FK_KON_PERSON_SCHUELER\": \"85906\",
    \"FK_LEHR_EINSENDEAUFGABE_LEHRER\": \"5\",
    \"FK_MDT_MANDANT\": \"1\",
    \"FK_STD_BEW_BEWERTUNGSTYP\": \"1\",
    \"GESAMTURTEIL\": \"AUSREICHEND\",
    \"INHALT_WERT\": \"2\",
    \"KORREKTHEIT_WERT\": \"2\",
    \"VERFUEGBARE_SPRACHLICHE_MITTEL_WERT\": \"2\",
    \"GESAMTEINDRUCK_WERT\": \"2\",
    \"COMM\": \"asdf\",
    \"STAERKEN_UND_POSITIVE_ASPEKTE\": \"sad\",
    \"VERBESSERUNGSPOTENTIAL\": \"asd\",
    \"EMPFEHLUNG_NAECHSTE_SCHRITTE\": \"asd\",
    \"INHALT_TEXT\": \"asfd\",
    \"KORREKTHEIT_TEXT\": \"asd\",
    \"SPRACHLICHE_MITTEL_TEXT\": \"asdf\",
    \"GESAMTEINDRUCK_TEXT\": \"asfd\",
    \"INHALT_SKALA\": 1,
    \"KORREKTHEIT_SKALA\": 1,
    \"SPRACHLICHE_MITTEL_SKALA\": 1,
    \"GESAMTEINDRUCK_SKALA\": 1,
    \"PK_LEHR_BEWERTUNG_SCHUELER\": \"45\",
    \"MODIFIED_AT\": \"$(date -u +'%Y-%m-%dT%H:%M:%S.%3NZ')\"
  }"