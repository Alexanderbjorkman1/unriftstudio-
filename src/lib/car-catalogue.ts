/** Enough coverage for the booking form; anything else goes in as free text. */
export const CAR_MAKES: Record<string, string[]> = {
  Audi: ["A1", "A3", "A4", "A5", "A6", "A7", "A8", "Q3", "Q5", "Q7", "Q8", "e-tron", "TT"],
  BMW: ["1 Series", "2 Series", "3 Series", "5 Series", "7 Series", "320d", "330e", "520d", "530d", "X1", "X3", "X5", "X7", "i4", "iX", "M3", "M4"],
  Cupra: ["Born", "Formentor", "Leon"],
  Ford: ["Fiesta", "Focus", "Kuga", "Mustang", "Mustang Mach-E", "Ranger"],
  Honda: ["Civic", "CR-V", "HR-V", "Jazz"],
  Hyundai: ["i20", "i30", "Ioniq 5", "Ioniq 6", "Kona", "Tucson"],
  Kia: ["Ceed", "EV6", "Niro", "Sportage", "Stonic"],
  "Land Rover": ["Defender", "Discovery", "Range Rover", "Range Rover Evoque", "Range Rover Sport"],
  Lexus: ["ES", "NX", "RX", "UX"],
  Mazda: ["2", "3", "6", "CX-30", "CX-5", "MX-5"],
  Mercedes: ["A-Class", "C-Class", "E200", "E-Class", "S-Class", "GLA", "GLC", "GLE", "EQC", "EQE"],
  Mini: ["Cooper", "Cooper S", "Countryman"],
  Nissan: ["Ariya", "Juke", "Leaf", "Qashqai", "X-Trail"],
  Peugeot: ["208", "308", "2008", "3008", "5008"],
  Polestar: ["2", "3", "4"],
  Porsche: ["718 Cayman", "911", "Cayenne", "Macan", "Panamera", "Taycan"],
  Renault: ["Captur", "Clio", "Megane", "Zoe"],
  Seat: ["Ateca", "Ibiza", "Leon"],
  Skoda: ["Enyaq", "Fabia", "Kodiaq", "Octavia", "Superb"],
  Subaru: ["Forester", "Outback", "XV"],
  Tesla: ["Model 3", "Model S", "Model X", "Model Y"],
  Toyota: ["Aygo", "bZ4X", "Corolla", "C-HR", "Prius", "RAV4", "Yaris"],
  Volvo: ["C40", "EX30", "S60", "S90", "V40", "V60", "V90", "XC40", "XC60", "XC90"],
  VW: ["Golf", "Golf R", "ID.3", "ID.4", "Passat", "Polo", "Tiguan", "T-Roc", "Touareg"],
};

/** SUVs and big estates cost more to detail — default the size class from the model. */
export function suggestSize(make: string, model: string): "small" | "medium" | "large" | "xl" {
  const text = `${make} ${model}`.toLowerCase();
  if (/xc90|x5|x7|q7|q8|gle|range rover|touareg|cayenne|kodiaq|discovery|defender|ranger|model x/.test(text)) return "xl";
  if (/xc60|x3|q5|glc|rav4|tucson|sportage|tiguan|model y|ev6|ioniq|enyaq|id\.4|xc40|forester|outback|3008|5008|cx-5|nx|rx/.test(text)) return "large";
  if (/v60|v70|v90|s90|passat|superb|octavia|a6|a7|a8|e-class|5 series|7 series|530d|520d|e200|s-class|panamera|model s/.test(text)) return "large";
  if (/aygo|up|polo|fiesta|yaris|i20|clio|ibiza|fabia|mini|cooper|mx-5|911|718|smart|zoe/.test(text)) return "small";
  return "medium";
}
