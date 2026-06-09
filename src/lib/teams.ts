interface TeamInfo {
  nameEs: string;
  flag: string;
}

const TEAMS: Record<string, TeamInfo> = {
  // CONMEBOL
  ARG: { nameEs: "Argentina", flag: "🇦🇷" },
  BRA: { nameEs: "Brasil", flag: "🇧🇷" },
  URU: { nameEs: "Uruguay", flag: "🇺🇾" },
  COL: { nameEs: "Colombia", flag: "🇨🇴" },
  ECU: { nameEs: "Ecuador", flag: "🇪🇨" },
  VEN: { nameEs: "Venezuela", flag: "🇻🇪" },
  PAR: { nameEs: "Paraguay", flag: "🇵🇾" },
  BOL: { nameEs: "Bolivia", flag: "🇧🇴" },
  PER: { nameEs: "Perú", flag: "🇵🇪" },
  CHI: { nameEs: "Chile", flag: "🇨🇱" },
  CHL: { nameEs: "Chile", flag: "🇨🇱" },

  // CONCACAF
  USA: { nameEs: "Estados Unidos", flag: "🇺🇸" },
  MEX: { nameEs: "México", flag: "🇲🇽" },
  CAN: { nameEs: "Canadá", flag: "🇨🇦" },
  PAN: { nameEs: "Panamá", flag: "🇵🇦" },
  CRC: { nameEs: "Costa Rica", flag: "🇨🇷" },
  HON: { nameEs: "Honduras", flag: "🇭🇳" },
  HND: { nameEs: "Honduras", flag: "🇭🇳" },
  JAM: { nameEs: "Jamaica", flag: "🇯🇲" },
  CUB: { nameEs: "Cuba", flag: "🇨🇺" },
  GUA: { nameEs: "Guatemala", flag: "🇬🇹" },
  SLV: { nameEs: "El Salvador", flag: "🇸🇻" },
  TRI: { nameEs: "Trinidad y Tobago", flag: "🇹🇹" },

  // UEFA
  FRA: { nameEs: "Francia", flag: "🇫🇷" },
  ENG: { nameEs: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  ESP: { nameEs: "España", flag: "🇪🇸" },
  GER: { nameEs: "Alemania", flag: "🇩🇪" },
  POR: { nameEs: "Portugal", flag: "🇵🇹" },
  NED: { nameEs: "Países Bajos", flag: "🇳🇱" },
  BEL: { nameEs: "Bélgica", flag: "🇧🇪" },
  CRO: { nameEs: "Croacia", flag: "🇭🇷" },
  SRB: { nameEs: "Serbia", flag: "🇷🇸" },
  DEN: { nameEs: "Dinamarca", flag: "🇩🇰" },
  AUT: { nameEs: "Austria", flag: "🇦🇹" },
  SUI: { nameEs: "Suiza", flag: "🇨🇭" },
  HUN: { nameEs: "Hungría", flag: "🇭🇺" },
  ROU: { nameEs: "Rumania", flag: "🇷🇴" },
  SVK: { nameEs: "Eslovaquia", flag: "🇸🇰" },
  UKR: { nameEs: "Ucrania", flag: "🇺🇦" },
  GEO: { nameEs: "Georgia", flag: "🇬🇪" },
  ALB: { nameEs: "Albania", flag: "🇦🇱" },
  SVN: { nameEs: "Eslovenia", flag: "🇸🇮" },
  SLO: { nameEs: "Eslovenia", flag: "🇸🇮" },
  CZE: { nameEs: "República Checa", flag: "🇨🇿" },
  POL: { nameEs: "Polonia", flag: "🇵🇱" },
  TUR: { nameEs: "Turquía", flag: "🇹🇷" },
  SCO: { nameEs: "Escocia", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  WAL: { nameEs: "Gales", flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿" },
  IRL: { nameEs: "Irlanda", flag: "🇮🇪" },
  GRE: { nameEs: "Grecia", flag: "🇬🇷" },
  NOR: { nameEs: "Noruega", flag: "🇳🇴" },
  SWE: { nameEs: "Suecia", flag: "🇸🇪" },
  FIN: { nameEs: "Finlandia", flag: "🇫🇮" },
  ISL: { nameEs: "Islandia", flag: "🇮🇸" },
  MNE: { nameEs: "Montenegro", flag: "🇲🇪" },
  BIH: { nameEs: "Bosnia y Herzegovina", flag: "🇧🇦" },
  NMK: { nameEs: "Macedonia del Norte", flag: "🇲🇰" },
  ISR: { nameEs: "Israel", flag: "🇮🇱" },
  KOS: { nameEs: "Kosovo", flag: "🇽🇰" },

  // AFC
  JPN: { nameEs: "Japón", flag: "🇯🇵" },
  KOR: { nameEs: "Corea del Sur", flag: "🇰🇷" },
  AUS: { nameEs: "Australia", flag: "🇦🇺" },
  IRN: { nameEs: "Irán", flag: "🇮🇷" },
  SAU: { nameEs: "Arabia Saudita", flag: "🇸🇦" },
  IRQ: { nameEs: "Irak", flag: "🇮🇶" },
  JOR: { nameEs: "Jordania", flag: "🇯🇴" },
  UZB: { nameEs: "Uzbekistán", flag: "🇺🇿" },
  OMN: { nameEs: "Omán", flag: "🇴🇲" },
  QAT: { nameEs: "Catar", flag: "🇶🇦" },
  CHN: { nameEs: "China", flag: "🇨🇳" },
  IND: { nameEs: "India", flag: "🇮🇳" },
  THA: { nameEs: "Tailandia", flag: "🇹🇭" },
  VIE: { nameEs: "Vietnam", flag: "🇻🇳" },
  IDN: { nameEs: "Indonesia", flag: "🇮🇩" },
  BHR: { nameEs: "Baréin", flag: "🇧🇭" },
  KUW: { nameEs: "Kuwait", flag: "🇰🇼" },

  // CAF
  MAR: { nameEs: "Marruecos", flag: "🇲🇦" },
  SEN: { nameEs: "Senegal", flag: "🇸🇳" },
  NGA: { nameEs: "Nigeria", flag: "🇳🇬" },
  CMR: { nameEs: "Camerún", flag: "🇨🇲" },
  EGY: { nameEs: "Egipto", flag: "🇪🇬" },
  GHA: { nameEs: "Ghana", flag: "🇬🇭" },
  RSA: { nameEs: "Sudáfrica", flag: "🇿🇦" },
  ALG: { nameEs: "Argelia", flag: "🇩🇿" },
  CIV: { nameEs: "Costa de Marfil", flag: "🇨🇮" },
  TUN: { nameEs: "Túnez", flag: "🇹🇳" },
  DRC: { nameEs: "R. D. del Congo", flag: "🇨🇩" },
  COD: { nameEs: "R. D. del Congo", flag: "🇨🇩" },
  MLI: { nameEs: "Mali", flag: "🇲🇱" },
  ZAM: { nameEs: "Zambia", flag: "🇿🇲" },
  ANG: { nameEs: "Angola", flag: "🇦🇴" },
  MOZ: { nameEs: "Mozambique", flag: "🇲🇿" },
  BFA: { nameEs: "Burkina Faso", flag: "🇧🇫" },
  GAB: { nameEs: "Gabón", flag: "🇬🇦" },
  UGA: { nameEs: "Uganda", flag: "🇺🇬" },

  // OFC
  NZL: { nameEs: "Nueva Zelanda", flag: "🇳🇿" },
};

export function getTeamInfo(tla: string | null): TeamInfo | null {
  if (!tla) return null;
  return TEAMS[tla.toUpperCase()] ?? null;
}

export function formatTeamEs(name: string, tla: string | null): string {
  const info = getTeamInfo(tla);
  return info ? info.nameEs : name;
}

export function getTeamFlag(tla: string | null): string {
  if (!tla) return "";
  return TEAMS[tla.toUpperCase()]?.flag ?? "";
}

export function formatTeamDisplay(name: string, tla: string | null): string {
  const info = getTeamInfo(tla);
  if (!info) return name;
  return `${info.flag} ${info.nameEs}`;
}
