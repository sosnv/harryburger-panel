const burgers = [
  {
    name: "CLASSIC",
    description:
      "Wołowina Hereford lub Kurczak, sałata, pomidor, ogórek, cebula, sos firmowy",
    prices: {
      smash90: 22.0,
      beef: 29.0,
      chicken: 25.0,
    },
    availableMeats: ["smash90", "beef", "chicken"],
    image: "/images/new/burgers/klasyk.webp",
  },
  {
    name: "Cheese",
    description:
      "Wołowina Hereford lub Kurczak, ser cheddar x2, sałata, pomidor, ogórek, cebula, sos firmowy",
    prices: {
      smash90: 26.0,
      beef: 31.0,
      chicken: 27.0,
    },
    availableMeats: ["smash90", "beef", "chicken"],
    image: "/images/new/burgers/cheese.webp",
  },
  {
    name: "Bluecheese",
    description:
      "Wołowina Hereford lub Kurczak, bluechesse, sałata, pomidor, ogórek, cebula, sos rózowy",
    prices: {
      smash90: 26.0,
      beef: 32.0,
      chicken: 28.0,
    },
    availableMeats: ["smash90", "beef", "chicken"],
    image: "/images/new/burgers/bluecheese.webp",
  },
  {
    name: "Sharpjalapeno",
    description:
      "Wołowina Hereford lub Kurczak, sałata, ser cheddar x2, pomidor, ostry ogórek, papryczki jalapeno, pikatny sos majonezowy",
    prices: {
      smash90: 27.0,
      beef: 32.0,
      chicken: 28.0,
    },
    availableMeats: ["smash90", "beef", "chicken"],
    image: "/images/new/burgers/sharpjalapeno.webp",
  },
  {
    name: "Jack Daniels",
    description:
      "Wołowina Hereford lub Kurczak, sałata, ser cheddar x2, pomidor, ogórek, cebula prażona, sos Jack Daniels",
    prices: {
      smash90: 27.0,
      beef: 34.0,
      chicken: 30.0,
    },
    availableMeats: ["smash90", "beef", "chicken"],
    image: "/images/new/burgers/jackdaniels.webp",
  },
  {
    name: "Wege",
    description: "Kotlet vegański, pomidor, ogórek, sałata, cebula, sos",
    prices: {
      beef: 35.0,
    },
    availableMeats: ["beef"],
    image: "/images/new/burgers/wege.webp",
  },
  {
    name: "Szatan",
    description:
      "Wołowina Hereford lub Kurczak, pomidor, ostry ogórek, papryczki jalapeno, sałata, cheddar, sos prosto z piekła, jesz tego burgera na własną odpowiedzialność!",
    prices: {
      beef: 31.0,
      chicken: 30.0,
    },
    availableMeats: ["beef", "chicken"],
    image: "/images/new/burgers/szatan.webp",
  },
  {
    name: "Wypas",
    description:
      "Wołowina Hereford lub Kurczak, boczek x3, ser cheddar x2, ser gorgonzola, sałata, pomidor, ogórek, cebula prażona, sos firmowy, sos musztardowo-miodowy",
    prices: {
      smash90: 26.0,
      beef: 33.0,
      chicken: 31.0,
    },
    availableMeats: ["smash90", "beef", "chicken"],
    image: "/images/new/burgers/wypas.webp",
  },
  {
    name: "Harry",
    description:
      "Wołowina Hereford lub Kurczak, sałata, ser cheddar x2, pomidor, ogórek, cebula prażona, krążki cebulowe, sos biały oraz klasyczny",
    prices: {
      smash90: 25.0,
      beef: 32.0,
      chicken: 28.0,
    },
    availableMeats: ["smash90", "beef", "chicken"],
    image: "/images/new/burgers/harry.webp",
  },
  {
    name: "Bekon",
    description:
      "Wołowina Hereford lub kurczak, boczek x2, ser cheddar x2, pomidor, ogórek, cebula, sałata, sos barbecue",
    prices: {
      smash90: 24.0,
      beef: 32.0,
      chicken: 28.0,
    },
    availableMeats: ["smash90", "beef", "chicken"],
    image: "/images/new/burgers/bekon.webp",
  },
  {
    name: "Kafar",
    description:
      "Wołowina Hereford x2 lub Kurczak x2, boczek x4, pomidor, ogórek, cebula, ser cheddar x4, cebula prażona, sos firmowy, sos biały",
    prices: {
      smash90: 34.0,
      beef: 40.0,
      chicken: 38.0,
    },
    availableMeats: ["smash90", "beef", "chicken"],
    image: "/images/new/burgers/kafar.webp",
  },
  {
    name: "Burgerozilla",
    description:
      "Wielkie wyzwanie Harrego! Potrójne mięso (3x170g), 6 plastrów boczku, potrójny ser i do tego oczywiście sałata, pomidor, pikle oraz cebulka czerwona oraz prażona (sosy wedle własnego uznania). Dasz radę zjeść w 4 minuty? Wtedy masz za darmo :)",
    prices: {
      beef: 55.0,
      chicken: 51.0,
    },
    availableMeats: ["beef", "chicken"],
    image: "/images/new/burgers/burgerozilla.webp",
  },
  {
    name: "Drwal",
    description:
      "Wołowina Hereford lub Kurczak, sałata, rozpływający się ser camembert, pomidor, ogórek, boczek, żurawina",
    prices: {
      smash90: 30.0,
      beef: 35.0,
      chicken: 33.0,
    },
    availableMeats: ["smash90", "beef", "chicken"],
    image: "/images/new/burgers/drwal.webp",
  },
  {
    name: "Serowy",
    description:
      "Wołowina Hereford lub Kurczak, ser cheddar x2, sałata, pomidor, ogórek, cebula, sos firmowy",
    prices: {
      smash90: 23.0,
      beef: 30.0,
      chicken: 27.0,
    },
    availableMeats: ["smash90", "beef", "chicken"],
    image: "/images/new/burgers/serowy.webp",
  },
  {
    name: "Nachos",
    description:
      "Wołowina Hereford lub Kurczak, ser cheddar x2, nachosy, sałata, papryka jalapeno, ogórek, cebula, sos firmowy.",
    prices: {
      smash90: 25.0,
      beef: 34.0,
      chicken: 30.0,
    },
    availableMeats: ["smash90", "beef", "chicken"],
    image: "/images/new/burgers/nachos.webp",
  },
  {
    name: "Mini",
    description:
      "Wołowina Hereford/kurczak, ser cheddar, sałata, pomidor, ogórek, cebula, sos firmowy",
    prices: {
      beef: 19.0,
      chicken: 17.0,
    },
    availableMeats: ["beef", "chicken"],
    image: "/images/new/burgers/mini.webp",
  },
  {
    name: "Nduja",
    description:
      "Wołowina Hereford lub Kurczak, włoska pikantna kiełbasa nduja, boczek, ser cheddar x2, sałata, pomidor, ogórek, cebula czerwona, sos klasyczny, sos bbq",
    prices: {
      smash90: 25.0,
      beef: 31.0,
      chicken: 30.0,
    },
    availableMeats: ["smash90", "beef", "chicken"],
    image: "/images/new/burgers/nduja.webp",
  },
  {
    name: "Boss",
    description:
      "Wołowina Hereford lub Kurczak, trzy plastry boczku, włoska kiełbasa N'Duja, Pasta tartufata ze startym serem Reggiano Parmezan, serek mascarpone NUOVA CASTELLI, ser żółty, ser gorgonzola, pomidor, ogórek",
    prices: {
      smash90: 29.0,
      beef: 39.0,
      chicken: 35.0,
    },
    availableMeats: ["smash90", "beef", "chicken"],
    image: "/images/new/burgers/boss.webp",
  },
];

export default burgers;
