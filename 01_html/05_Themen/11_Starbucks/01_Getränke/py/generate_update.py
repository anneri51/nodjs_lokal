# -*- coding: utf-8 -*-
import os
import re

# ----------------------------------------------------------------------
# 1. The raw data block (exactly as you provided in the first message)
#    First line is the header, following lines are the products.
# ----------------------------------------------------------------------
raw_data = """
PK_STAR_STARBUCKS_GETRAENK_GROUP	MAIN_GETRAENK	GETRAENK	FK_BILD_BILDER	type_Latte___	type_Latte_Velvet Latte__	type_Getränketypen_Lemonade__	type_Getränketypen_Ube__	type_Getränketypen_Frappuccino__	type_Getränketypen_Chai_Tea__	type_Getränketypen_Tea__	type_Getränketypen_Tea_Hot_Tea_	type_Getränketypen_Tea_Hot_Tea_English_Breakfast	type_Getränketypen_Tea_Hot_Tea_Emperors_Cloud	type_Getränketypen_Tea_Iced_Tea_	type_Getränketypen_Tea_Iced_Tea_Peach	type_Getränketypen_Matcha__	type_Getränketypen_Chocolate__	type_Getränketypen_Coffee__	type_Getränketypen_Coffee_Mocha_	type_Getränketypen_Coffee_Macchiato_	type_Getränketypen_Coffee_Americano_	type_Getränketypen_Coffee_Cappuccino_	type_Getränketypen_Coffee_Espresso_	type_Getränketypen_Coffee_Espresso_Classic	type_Getränketypen_Coffee_Espresso_Oat Shaken Espresso	type_Getränketypen_Coffee_Espresso_Cortado	type_Getränketypen_Coffee_Cold_Brew_	type_Getränketypen_Coffee_Freshly Brew_	type_Getränketypen_Coffee_Filterkaffee_	type_Getränketypen_Refresha__	type_Getränketypen_Refresha_Cool_Lime_	type_Getränketypen_Refresha_Verry_Berry_	type_Temperature_Hot__	type_Temperature_Cold__	type_Temperature_Iced__	type_Geschmack_Vanilla__	type_Geschmack_Pistachio__	type_Geschmack_Caramel__	type_Geschmack_Java Chip__	type_Geschmack_Brown Sugar__	type_Size_Single__	type_Size_Doppio__	type_Size_Short__	type_Size_Tall__	type_Size_Grande__	type_Size_Venti__	type_Type_Cream__	type_Type_Coffee__	type_Coffeein_Classic__	type_Coffeein_Blonde__	type_Coffeein_Decaf__	type_Merkmal_White__	type_Merkmal_Signature__	type_Merkmal_Protein__	type_Merkmal_Blended__	type_Merkmal_Doubleshot__	type_Merkmal_Cookies__	type_Frucht_Mint__	type_Frucht_Peach__	type_Frucht_Mango__	type_Frucht_Orange__	type_Frucht_Dragonfruit__	type_Frucht_Passion__	type_Frucht_Strawberry__	type_Frucht_Verry_Berry__	type_Frucht_Lemon (Lime)__	type_Frucht_Hibiscus__	type_Frucht_Frucht__	type_Topping_Foam__	type_Topping_Syrup__	type_Topping_Schlagsahne__	type_Tea_Types_Black Tea__	type_Tea_Types_Green Tea__	type_Tea_Types_Mint Tea__	type_sugar___	type_sugar_sugar__	type_sugar_sugar_free__	type_milk_milk__	type_milk_Oatmilk__	type_milk_Halbfettmilch__	type_milk_Vollmilch__	type_milk_Magermilch__	type_Bestandteile_Hafer__	type_Bestandteile_Soja__	type_Bestandteile_Kokosnuss__	type_Bestandteile_Mandel__
1	Alternative Coffee Bean - Cold Coffee	Decaf Iced Mocha	20964																																																																																			
8	Refreshment	Strawberry Acai Starbucks Refresha	20968																																																																																			
9	Cold Beverages	Caramel Cloud Macchiato	20969																																																																																			
10	Alternative Coffee Bean - Cold Coffee	Decaf Iced Latte	20970																																																																																			
14	Alternative Coffee Bean - Espresso Drinks	Decaf Caramel Macchiato	20978																																																																																			
15	Tea Latte	Matcha Green Tea Latte	20979																																																																																			
17	Alternative Coffee Bean - Cold Coffee	Blonde Iced Latte	20983																																																																																			
18	Alternative Coffee Bean - Espresso Drinks	Decaf Americano	20984																																																																																			
19	Spring FY26 Promo Beverages Alternative Coffees	Decaf Iced Protein Matcha Latte	20987																																																																																			
20	Alternative Coffee Bean - Espresso Drinks	Decaf Espresso	20988																																																																																			
21	Hot Coffee	Filterkaffee	20989																																																																																			
22	Tea Latte	Iced Chai Tea Latte	20990																																																																																			
24	Hot Coffee	Espresso Con Panna (mit Sahne)	20992																																																																																			
25	Refreshment	Cool Lime Starbucks Refresha	20993																																																																																			
26	Cream Frappuccino® Blended Beverages	Matcha Cream Frappuccino	20994																																																																																			
27	Alternative Coffee Bean - Cold Coffee	Blonde Iced Caramel Macchiato	20995																																																																																			
32	Alternative Coffee Bean - Espresso Drinks	Blonde White Mocha	21000																																																																																			
38	Cold Coffee	Iced Latte Macchiato	21007																																																																																			
45	Spring FY26 Promo Beverages	Ube Vanilla Flavoured Velvet Matcha	21019																																																																																			
50	Extras & Toppings	Cr me Brul e Cold Foam	21025																																																																																			
52	Spring FY26 Promo Beverages Alternative Coffees	Decaf Ube Vanilla Flavoured Velvet Latte	21027																																																																																			
54	Hot Chocolates	White Hot Chocolate	21030																																																																																			
59	Espresso Drinks	Mocha	21035																																																																																			
60	Cold Craft	Cold Brew	21036																																																																																			
62	Alternative Coffee Bean - Frappuccino	Decaf Caramel Frappuccino	21038																																																																																			
63	Alternative Coffee Bean - Espresso Drinks	Blonde Mocha	21039																																																																																			
64	Heiße Getränke	Vanilla Latte	21040																																																																																			
69	Spring FY26 Promo Beverages Alternative Coffees	Decaf Iced Ube Vanilla Flavoured Macchiato	21059																																																																																			
70	Espresso Drinks	Cappuccino	21060																																																																																			
71	Alternative Coffee Bean - Cold Coffee	Blonde Starbucks Doubleshot Vanilla Iced Coffee	21062																																																																																			
75	Alternative Coffee Bean - Cold Coffee	Blonde Iced White Mocha	21065																																																																																			
78	Alternative Coffee Bean - Espresso Drinks	Blonde Flat White	21068																																																																																			
82	Hot Teas	English Breakfast Tea	21072																																																																																			
85	Spring FY26 Promo Beverages	Ube Vanilla Flavoured Coffee Frappuccino	21075																																																																																			
89	Cream Frappuccino® Blended Beverages	Vanilla Cream Frappuccino	21080																																																																																			
87	Refresha  drinks mit Extrakt aus gr nen Kaffeebohnen	Dragon Coconut Starbucks Refresha  drink	21078																																																																																			
90	Alternative Coffee Bean - Cold Coffee	Decaf Iced Americano	21081																																																																																			
91	Hot Chocolates	Classic Hot Chocolate	21082																																																																																			
92	Alternative Coffee Bean - Cold Coffee	Decaf Starbucks Doubleshot Iced Coffee	21083																																																																																			
93	Espresso Drinks	White Mocha	21084																																																																																			
28	Spring FY26 Promo Beverages Alternative Coffees	Protein Matcha Latte	20996																																																																																			
94	Iced Tea Beverages	Iced Black Tea Lemonade	21085																																																																																			
96	Cream Frappuccino® Blended Beverages	Strawberries & Cream Frappuccino	21087																																																																																			
98	Spring FY26 Promo Beverages	Iced Ube Vanilla Flavoured Velvet Latte	21089																																																																																			
99	Espresso Drinks	Latte Macchiato	21090																																																																																			
103	Tea Latte	Iced Matcha Green Tea Latte	21095																																																																																			
104	Iced Tea Beverages	Iced Hibiscus Tea Lemonade	21096																																																																																			
106	Alternative Coffee Bean - Espresso Drinks	Blonde Espresso Macchiato	21098																																																																																			
107	Alternative Coffee Bean - Cold Coffee	Decaf Iced White Mocha	21099																																																																																			
109	Alternative Coffee Bean - Espresso Drinks	Decaf Latte Macchiato	21101																																																																																			
113	Alternative Coffee Bean - Espresso Drinks	Decaf Cappuccino	21092																																																																																			
112	Espresso Drinks	Espresso Macchiato - Doppio	21106																																																																																			
115	Alternative Coffee Bean - Cold Coffee	Decaf Iced Brown Sugar Oat Shaken Espresso	21109																																																																																			
116	Alternative Coffee Bean - Cold Coffee	Decaf Classic Iced Cappuccino	21110																																																																																			
117	Coffee Frappuccino  Blended Beverages	Espresso Coffee Frappuccino  Blended Beverage	21111																																																																																			
118	Saisonale Getr nke	Iced Pistachio Flavour Macchiato	21112																																																																																			
121	Spring FY26 Promo Beverages Alternative Coffees	Iced Protein Sugar Free Vanilla Latte	21115																																																																																			
123	Frappuccino 	Chocolate Cream Frappuccino	21117																																																																																			
124	Alternative Coffee Bean - Espresso Drinks	Decaf Cortado	21118																																																																																			
125	Alternative Coffee Bean - Cold Coffee	Blonde Iced Latte Macchiato	21119																																																																																			
131	Saisonale Getr nke	Pistachio Flavour Macchiato	21128																																																																																			
137	Extras & Toppings	Blended Fruit Juice	21134																																																																																			
138	Alternative Coffee Bean - Espresso Drinks	Blonde Espresso	21139																																																																																			
139	Alternative Coffee Bean - Frappuccino	Decaf Java Chip Frappuccino	21140																																																																																			
141	Alternative Coffee Bean - Espresso Drinks	Decaf White Mocha 	21141																																																																																			
143	Espresso Drinks	Flat White	21143																																																																																			
144	Spring FY26 Promo Beverages Alternative Coffees	Blonde Iced Protein Matcha Latte	21144																																																																																			
145	Saisonale Getr nke	Iced Pistachio Flavour Chocolate	21146																																																																																			
147	Hot Coffee	Cafe Creme	21148																																																																																			
149	Heiße Getränke	Matcha Tea Latte	21150																																																																																			
151	Hot Teas	Emperor's Clouds & Mist Tea	21152																																																																																			
155	Espresso Drinks	Espresso Macchiato - Single	21155																																																																																			
156	Cold Craft	Cold Brew Latte	21156																																																																																			
157	Spring FY26 Promo Beverages Alternative Coffees	Blonde Protein Sugar Free Vanilla Latte	21157																																																																																			
159	Cold Coffee	Iced Brown Sugar Oat Shaken Espresso	21160																																																																																			
161	Espresso Drinks	Caramel Macchiato	21162																																																																																			
162	Extras & Toppings	Cookies & Cream Cold Foam	21163																																																																																			
1	Iced Chocolates	Iced Chocolate	20961																																																																																			
2	Heiße Getränke	Aufgeschäumte Milch	20962																																																																																			
3	Cold Coffee	Iced White Mocha	20963																																																																																			
5	Refresha  drinks mit Extrakt aus gr nen Kaffeebohnen	Pink Coconut Refresha  drink	20965																																																																																			
6	Espresso Drinks	Espresso - Doppio	20966																																																																																			
7	Spring FY26 Promo Beverages	Ube Vanilla Flavoured Velvet Latte	20967																																																																																			
11	Alternative Coffee Bean - Espresso Drinks	Blonde Cortado	20975																																																																																			
12	Refreshment	Orange & Mango Refresha	20976																																																																																			
13	Cold Coffee	Iced Mocha	20977																																																																																			
16	Spring FY26 Promo Beverages Alternative Coffees	Iced Protein Matcha Latte	20980																																																																																			
23	Alternative Coffee Bean - Cold Coffee	Decaf Iced Latte Macchiato	20991																																																																																			
30	Saisonale Getr nke	Iced Pistachio Flavour Matcha Latte	20998																																																																																			
31	Frappuccino 	Double Chocolatey Chip Cream Frappuccino	20999																																																																																			
33	Cream Frappuccino® Blended Beverages	Caramel Cream Frappuccino	21001																																																																																			
34	Alternative Coffee Bean - Espresso Drinks	Decaf Caffe Latte	21003																																																																																			
35	Alternative Coffee Bean - Cold Coffee	Decaf Iced Caramel Macchiato	21004																																																																																			
36	Spring FY26 Promo Beverages	Ube Vanilla Flavoured Cream Frappuccino	21005																																																																																			
37	Cream Frappuccino® Blended Beverages	Cookies & Cream Frappuccino	21006																																																																																			
39	Alternative Coffee Bean - Espresso Drinks	Blonde Caffe Latte	21008																																																																																			
40	Heiße Getränke	White Chocolate Mocha	21009																																																																																			
41	Extras & Toppings	Matcha Cream Cold Foam	21010																																																																																			
42	Extras & Toppings	Bar Mocha Syrup	21011																																																																																			
43	Heiße Getränke	Cafe Misto	21014																																																																																			
44	Cold Coffee	Iced Americano	21017																																																																																			
46	Alternative Coffee Bean - Espresso Drinks	Decaf Espresso Macchiato	21021																																																																																			
47	Tea Latte	Chai Tea Latte	21022																																																																																			
48	Alternative Coffee Bean - Cold Coffee	Decaf Starbucks Doubleshot Vanilla Iced Coffee	21023																																																																																			
49	Refresha  drinks mit Extrakt aus gr nen Kaffeebohnen	Mango Dragonfruit Starbucks Refresha  drink	21024																																																																																			
51	Hot Chocolates	Signature Hazelnut Chocolate	21026																																																																																			
53	Saisonale Getr nke	Iced Pistachio Flavour Oat Shaken Espresso	21029																																																																																			
55	Espresso Drinks	Americano	21031																																																																																			
56	Cold Coffee	Starbucks Doubleshot  Iced Coffee	21032																																																																																			
57	Hot Chocolates	Signature Hot Chocolate	21033																																																																																			
61	Refreshment	Peach Iced Tea	21037																																																																																			
65	Extras & Toppings	Syrups	21041																																																																																			
66	Frappuccino 	Caramel Frappuccino  	21056																																																																																			
67	Extras & Toppings	Vegane Schlagcreme Topping	21057																																																																																			
68	Espresso Drinks	Espresso - Single	21058																																																																																			
72	Spring FY26 Promo Beverages	Iced Ube Vanilla Flavoured Macchiato	21060																																																																																			
73	Cold Coffee	Iced Caramel Macchiato	21063																																																																																			
74	Iced Tea Beverages	Iced Green Tea Lemonade	21064																																																																																			
76	Cold Beverages	Signature Iced White Chocolate 	21066																																																																																			
79	Saisonale Getr nke	Pistachio Flavour Cr me Frappuccino  Blended Beverage	21069																																																																																			
80	Cold Coffee	Iced Latte	21070																																																																																			
81	Alternative Coffee Bean - Espresso Drinks	Decaf Mocha	21071																																																																																			
83	Saisonale Getr nke	Iced Pistachio Flavour Latte	21073																																																																																			
86	Alternative Coffee Bean - Frappuccino	Decaf Mocha Frappuccino	21076																																																																																			
88	Alternative Coffee Bean - Cold Coffee	Blonde Classic Iced Cappuccino	21079																																																																																			
29	Alternative Coffee Bean - Espresso Drinks	Blonde Latte Macchiato	20997																																																																																			
95	Alternative Coffee Bean - Frappuccino	Decaf Coffee Frappuccino	21086																																																																																			
97	Hot Teas	Mint Herbal Blend	21088																																																																																			
100	Alternative Coffee Bean - Cold Coffee	Blonde Iced Mocha	21091																																																																																			
101	Alternative Coffee Bean - Espresso Drinks	Blonde Cappuccino	21092																																																																																			
105	Frappuccino 	Mocha Frappuccino	21097																																																																																			
108	Saisonale Getr nke	Pistachio Flavour Matcha Latte	21100																																																																																			
110	Iced Tea Beverages	Iced Peach Green Tea Lemonade	21102																																																																																			
114	Spring FY26 Promo Beverages Alternative Coffees	Decaf Ube Vanilla Flavoured Macchiato	21108																																																																																			
119	Alternative Coffee Bean - Cold Coffee	Blonde Iced Americano	21113																																																																																			
122	Cream Frappuccino  Blended Beverages	Chai Tea Cream Frappuccino 	21116																																																																																			
126	Espresso Drinks	Cortado	21120																																																																																			
127	Alternative Coffee Bean - Cold Coffee	Signature Iced Brown Sugar Oat Shaken Espresso	21124																																																																																			
128	Hot Teas	Earl Grey Tea	21125																																																																																			
129	Alternative Coffee Bean - Espresso Drinks	Blonde Caramel Macchiato	21126																																																																																			
132	Extras & Toppings	Strawberry Cold Foam	21129																																																																																			
133	Frappuccino 	Coffee Frappuccino	21130																																																																																			
134	Spring FY26 Promo Beverages Alternative Coffees	Protein Sugar Free Vanilla Latte	21131																																																																																			
135	Refreshment	Very Berry Hibiscus Refresha	21132																																																																																			
136	Cold Coffee	Classic Iced Cappuccino	21133																																																																																			
142	Spring FY26 Promo Beverages Alternative Coffees	Signature Iced Ube Vanilla Flavoured Velvet Latte	21142																																																																																			
146	Alternative Coffee Bean - Cold Coffee	Blonde Starbucks Doubleshot Iced Coffee	21147																																																																																			
150	Espresso Drinks	Freshly Brewed Coffee	21151																																																																																			
153	Spring FY26 Promo Beverages	Iced Ube Vanilla Flavoured Matcha Latte	21153																																																																																			
154	Spring FY26 Promo Beverages	Ube Vanilla Flavoured Macchiato	21154																																																																																			
158	Saisonale Getr nke	Pistachio Flavour Oat Velvet Latte	21159																																																																																			
160	Cream Frappuccino® Blended Beverages	Java Chip Frappuccino	21161																																																																																			
163	Alternative Coffee Bean - Espresso Drinks	Blonde Americano	21164																																																																																			
164	Extras & Toppings	Schlagsahne Topping	21165																																																																																			
165	Spring FY26 Promo Beverages Alternative Coffees	Decaf Protein Sugar Free Vanilla Latte	21166																																																																																			
130	Espresso Drinks	Caffe Latte	21127																																																																																			
58	Alternative Coffee Bean - Espresso Drinks	Decaf Flat White	21034																																																																																			
77	Spring FY26 Promo Beverages Alternative Coffees	Signature Iced Ube Vanilla Flavoured Macchiato	21067																																																																																			
84	Spring FY26 Promo Beverages Alternative Coffees	Signature Ube Vanilla Flavoured Velvet Latte	21074																																																																																			
102	Coffee Frappuccino  Blended Beverages	White Mocha Coffee Frappuccino  Blended Beverage	21094																																																																																			
111	Spring FY26 Promo Beverages Alternative Coffees	Decaf Iced Ube Vanilla Flavoured Velvet Latte	21103																																																																																			
120	Spring FY26 Promo Beverages Alternative Coffees	Decaf Ube Vanilla Flavoured Coffee Frappuccino	21114																																																																																			
166	Cold Coffee	Iced Dubai Chocolate Matcha	21145																																																																																			
148	Spring FY26 Promo Beverages Alternative Coffees	Signature Ube Vanilla Flavoured Macchiato	21149																																																																																			
"""

# ----------------------------------------------------------------------
# 2. Keyword → column mapping (same as before)
# ----------------------------------------------------------------------
keyword_map = {
    "mocha": "type_Getränketypen_Coffee_Mocha_",
    "latte": "type_Getränketypen_Coffee__",
    "macchiato": "type_Getränketypen_Coffee_Macchiato_",
    "americano": "type_Getränketypen_Coffee_Americano_",
    "cappuccino": "type_Getränketypen_Coffee_Cappuccino_",
    "espresso": "type_Getränketypen_Coffee_Espresso_",
    "cold brew": "type_Getränketypen_Coffee_Cold_Brew_",
    "freshly brewed": "type_Getränketypen_Coffee_Freshly_Brew_",
    "filterkaffee": "type_Getränketypen_Coffee_Filterkaffee_",
    "frappuccino": "type_Getränketypen_Frappuccino__",
    "refresha": "type_Getränketypen_Refresha__",
    "chai tea": "type_Getränketypen_Chai_Tea__",
    "matcha": "type_Getränketypen_Matcha__",
    "chocolate": "type_Getränketypen_Chocolate__",
    "ube": "type_Getränketypen_Ube__",
    "lemonade": "type_Getränketypen_Lemonade__",
    "hot": "type_Temperature_Hot__",
    "iced": "type_Temperature_Iced__",
    "cold": "type_Temperature_Cold__",
    "vanilla": "type_Geschmack_Vanilla__",
    "pistachio": "type_Geschmack_Pistachio__",
    "caramel": "type_Geschmack_Caramel__",
    "java chip": "type_Geschmack_Java_Chip__",
    "brown sugar": "type_Geschmack_Brown_Sugar__",
    "decaf": "type_Coffeein_Decaf__",
    "blonde": "type_Coffeein_Blonde__",
    "white": "type_Merkmal_White__",
    "signature": "type_Merkmal_Signature__",
    "protein": "type_Merkmal_Protein__",
    "blended": "type_Merkmal_Blended__",
    "doubleshot": "type_Merkmal_Doubleshot__",
    "cookies": "type_Merkmal_Cookies__",
    "mint": "type_Frucht_Mint__",
    "peach": "type_Frucht_Peach__",
    "mango": "type_Frucht_Mango__",
    "orange": "type_Frucht_Orange__",
    "dragonfruit": "type_Frucht_Dragonfruit__",
    "passion": "type_Frucht_Passion__",
    "strawberry": "type_Frucht_Strawberry__",
    "very berry": "type_Frucht_Verry_Berry__",
    "lime": "type_Frucht_Lemon__Lime___",
    "hibiscus": "type_Frucht_Hibiscus__",
    "foam": "type_Topping_Foam__",
    "syrup": "type_Topping_Syrup__",
    "schlagsahne": "type_Topping_Schlagsahne__",
    "black tea": "type_Tea_Types_Black_Tea__",
    "green tea": "type_Tea_Types_Green_Tea__",
    "mint tea": "type_Tea_Types_Mint_Tea__",
    "sugar free": "type_sugar_sugar_free__",
    "oat": "type_milk_Oatmilk__",
    "halbfettmilch": "type_milk_Halbfettmilch__",
    "vollmilch": "type_milk_Vollmilch__",
    "magermilch": "type_milk_Magermilch__",
    "hafer": "type_Bestandteile_Hafer__",
    "soja": "type_Bestandteile_Soja__",
    "kokosnuss": "type_Bestandteile_Kokosnuss__",
    "mandel": "type_Bestandteile_Mandel__",
}

# ----------------------------------------------------------------------
# 3. Parse the raw data (skip header, split by tabs)
# ----------------------------------------------------------------------
def parse_product_lines(raw_text):
    lines = raw_text.strip().split("\n")
    # Skip first header line
    products = []
    for line in lines[1:]:
        if not line.strip():
            continue
        parts = line.split("\t")
        if len(parts) < 3:
            continue
        group_id = parts[0].strip()
        category = parts[1].strip()
        name = parts[2].strip()
        # Only keep if group_id is a number (the PK)
        if group_id.isdigit():
            products.append((int(group_id), category, name))
    return products

def generate_update(group_id, category, name):
    text = (name + " " + category).lower()
    attrs_to_set = set()
    
    for keyword, col in keyword_map.items():
        if keyword in text:
            attrs_to_set.add(col)
    
    # Additional rules (same as before)
    if "iced" in text:
        attrs_to_set.add("type_Temperature_Iced__")
    if "hot" in category.lower() or "hot" in name.lower():
        attrs_to_set.add("type_Temperature_Hot__")
    if "cold" in category.lower() or "cold" in name.lower() or "iced" in text:
        attrs_to_set.add("type_Temperature_Cold__")
    if "frappuccino" in text:
        attrs_to_set.add("type_Getränketypen_Frappuccino__")
        attrs_to_set.add("type_Merkmal_Blended__")
    if "refresha" in text:
        attrs_to_set.add("type_Getränketypen_Refresha__")
    if "matcha" in text:
        attrs_to_set.add("type_Getränketypen_Matcha__")
    if "chai" in text:
        attrs_to_set.add("type_Getränketypen_Chai_Tea__")
    if "coconut" in text:
        attrs_to_set.add("type_Bestandteile_Kokosnuss__")
    if "oat" in text:
        attrs_to_set.add("type_milk_Oatmilk__")
    if "protein" in text:
        attrs_to_set.add("type_Merkmal_Protein__")
    if "sugar free" in text:
        attrs_to_set.add("type_sugar_sugar_free__")
    if "doubleshot" in text:
        attrs_to_set.add("type_Merkmal_Doubleshot__")
    if "white" in text and ("chocolate" in text or "mocha" in text):
        attrs_to_set.add("type_Merkmal_White__")
    
    if not attrs_to_set:
        attrs_to_set.add("type_Getränketypen_Coffee__")
    
    # Corrected: double-quote each column name, no extra spaces inside f-string
    set_clause = ", ".join([f'"{col}" = 1' for col in sorted(attrs_to_set)])
    return f'UPDATE "COMPANY"."T_STAR_STARBUCKS_GETRAENKE_GROUP" SET {set_clause} WHERE "PK_STAR_STARBUCKS_GETRAENK_GROUP" = {group_id};'

# ----------------------------------------------------------------------
# 4. Main: parse, generate, write to file
# ----------------------------------------------------------------------
def main():
    products = parse_product_lines(raw_data)
    print(f"Parsed {len(products)} products.")
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_file = os.path.join(script_dir, "update_statements.txt")
    
    with open(output_file, "w", encoding="utf-8") as f:
        for gid, cat, name in products:
            sql = generate_update(gid, cat, name)
            f.write(sql + "\n")
            print(sql)
    
    print(f"\n✅ Saved {len(products)} UPDATE statements to: {output_file}")

if __name__ == "__main__":
    main()