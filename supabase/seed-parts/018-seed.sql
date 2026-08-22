-- BandarLab seed part 018 of 018
-- Run files in numeric order after the schema migration.

begin;

insert into public.shareholder_ownership (ticker, disclosure_threshold, issuer_name, investor_name, account_holder, classification, local_foreign, nationality, domicile, scripless_shares, scrip_shares, shares, share_change, percentage, report_date) values
  ('TRUS', 5, 'TRUST FINANCE INDONESIA Tbk, PT', 'HENDRY HARTATO', 'PT ARTHA SEKURITAS INDONESIA', null, 'L', null, 'INDONESIA', 0, 0, 56190000, 0, 7.02, '2026-08-13'),
  ('TSPC', 5, 'TEMPO SCAN PACIFIC Tbk, PT', 'PT. BOGAMULIA NAGADI', 'PT Bank OCBC NISP Tbk', null, 'L', null, 'INDONESIA', 0, 0, 4103235818, 0, 90.98, '2026-08-13'),
  ('TUGU', 5, 'ASURANSI TUGU PRATAMA INDONESIA Tbk, PT', 'UOB KAY HIAN PTE LTD', 'PT KAY HIAN SEKURITAS', null, 'A', null, 'SINGAPORE', 0, 0, 563200000, 0, 15.84, '2026-08-13'),
  ('TUGU', 5, 'ASURANSI TUGU PRATAMA INDONESIA Tbk, PT', 'SAMSUNG FIRE AND MARINE INSURANCE CO., LTD', 'MANDIRI SEKURITAS, PT', null, 'A', null, 'KOREA, REPUBLIC OF', 0, 0, 188234000, 0, 5.29, '2026-08-13'),
  ('UANG', 5, 'PAKUAN Tbk, PT', 'PT SIRIUS SURYA SENTOSA', 'PT CIPTADANA SEKURITAS ASIA', null, 'L', null, 'INDONESIA', 0, 0, 496049466, 0, 41, '2026-08-13'),
  ('UANG', 5, 'PAKUAN Tbk, PT', 'SIRIUS SURYA SENTOSA, PT', 'PT CIPTADANA SEKURITAS ASIA', null, 'L', null, 'INDONESIA', 0, 0, 496049466, 0, 41, '2026-08-13'),
  ('UANG', 5, 'PAKUAN Tbk, PT', 'HAPSORO', 'PT CGS International Sekuritas Indonesia', null, 'L', null, 'INDONESIA', 0, 0, 234178350, 0, 19.35, '2026-08-13'),
  ('UANG', 5, 'PAKUAN Tbk, PT', 'PT TIRTA ORISA YASA', 'PT CGS International Sekuritas Indonesia', null, 'L', null, 'INDONESIA', 0, 0, 196446000, 0, 16.24, '2026-08-13'),
  ('UANG', 5, 'PAKUAN Tbk, PT', 'BHINEKA ABADI INVESTAMA, PT', 'MANDIRI SEKURITAS, PT', null, 'L', null, 'INDONESIA', 0, 0, 114773100, 0, 9.49, '2026-08-13'),
  ('UCID', 5, 'UNI-CHARM INDONESIA Tbk, PT', 'PT APP PURINUSA EKAPERSADA', 'PT AMANTARA SEKURITAS INDONESIA', null, 'L', null, 'INDONESIA', 0, 0, 550000000, 0, 13.23, '2026-08-13'),
  ('UDNG', 5, 'AGRO BAHARI NUSANTARA Tbk, PT', 'JOSE LOUPIGA KELIAT', 'PT. TRIMEGAH SEKURITAS INDONESIA TBK', null, 'L', null, 'INDONESIA', 0, 0, 397500000, 0, 22.71, '2026-08-13'),
  ('UDNG', 5, 'AGRO BAHARI NUSANTARA Tbk, PT', 'VINCENT LUKITO', 'PT. TRIMEGAH SEKURITAS INDONESIA TBK', null, 'L', null, 'INDONESIA', 0, 0, 397500000, 0, 22.71, '2026-08-13'),
  ('UDNG', 5, 'AGRO BAHARI NUSANTARA Tbk, PT', 'CHRISTIAN BRANDON LIMBONO', 'PT. TRIMEGAH SEKURITAS INDONESIA TBK', null, 'L', null, 'INDONESIA', 0, 0, 97500000, 0, 5.57, '2026-08-13'),
  ('ULTJ', 5, 'ULTRAJAYA MILK INDUSTRY & TRADING COMPANY Tbk, PT', 'SABANA PRAWIRA WIDJAJA', 'PT Bank SMBC Indonesia Tbk', null, 'L', null, 'INDONESIA', 0, 0, 5528219300, 0, 53.17, '2026-08-13'),
  ('UNIC', 5, 'UNGGUL INDAH CAHAYA Tbk, PT', 'ASPIRASI LUHUR,PT', 'NET SEKURITAS, PT', null, 'L', null, 'INDONESIA', 0, 0, 139351604, 0, 36.35, '2026-08-13'),
  ('UNIC', 5, 'UNGGUL INDAH CAHAYA Tbk, PT', 'PT Alas Pusaka', 'EKOKAPITAL SEKURITAS, PT', null, 'L', null, 'INDONESIA', 0, 0, 43660821, 0, 11.39, '2026-08-13'),
  ('UNIC', 5, 'UNGGUL INDAH CAHAYA Tbk, PT', 'PT. SALIM CHEMICALS CORPORA', 'NET SEKURITAS, PT', null, 'L', null, 'INDONESIA', 0, 0, 39635036, 0, 10.34, '2026-08-13'),
  ('UNIC', 5, 'UNGGUL INDAH CAHAYA Tbk, PT', 'LAUTAN LUAS TBK, PT', 'SAMUEL SEKURITAS INDONESIA, PT', null, 'L', null, 'INDONESIA', 0, 0, 22858900, 0, 5.96, '2026-08-13'),
  ('UNIQ', 5, 'ULIMA NITRA Tbk, PT', 'BURHAN TJOKRO', 'PT SURYA FAJAR SEKURITAS', null, 'L', null, 'INDONESIA', 0, 0, 706818395, 0, 22.52, '2026-08-13'),
  ('UNIQ', 5, 'ULIMA NITRA Tbk, PT', 'ULUNG WIJAYA', 'PT SURYA FAJAR SEKURITAS', null, 'L', null, 'INDONESIA', 0, 0, 706818395, 0, 22.52, '2026-08-13'),
  ('UNIQ', 5, 'ULIMA NITRA Tbk, PT', 'JATI SIMINA', 'PT SURYA FAJAR SEKURITAS', null, 'L', null, 'INDONESIA', 0, 0, 375000000, 0, 11.95, '2026-08-13'),
  ('UNIQ', 5, 'ULIMA NITRA Tbk, PT', 'MERTY TJOKRO', 'PT SURYA FAJAR SEKURITAS', null, 'L', null, 'INDONESIA', 0, 0, 334302326, 0, 10.65, '2026-08-13'),
  ('UNIQ', 5, 'ULIMA NITRA Tbk, PT', 'MERTJE TJOKRO', 'PT SURYA FAJAR SEKURITAS', null, 'L', null, 'INDONESIA', 0, 0, 194767442, 0, 6.2, '2026-08-13'),
  ('UNIQ', 5, 'ULIMA NITRA Tbk, PT', 'TUTI NUARNI', 'PT SURYA FAJAR SEKURITAS', null, 'L', null, 'INDONESIA', 0, 0, 194767442, 0, 6.2, '2026-08-13'),
  ('UNIT', 5, 'CAHAYA PERMATA SEJAHTERA Tbk, PT', 'PT. LENOVO WORLDWIDE CORPORATION', 'PT PACIFIC SEKURITAS INDONESIA', null, 'A', null, 'VIRGIN ISLANDS, BRITISH', 0, 0, 16423425, 0, 21.78, '2026-08-13'),
  ('UNIT', 5, 'CAHAYA PERMATA SEJAHTERA Tbk, PT', 'BLOOM INTERNATIONAL LTD', 'PT PACIFIC SEKURITAS INDONESIA', null, 'A', null, 'UNITED KINGDOM', 0, 0, 5749750, 0, 7.62, '2026-08-13'),
  ('UNSP', 5, 'BAKRIE SUMATERA PLANTATIONS Tbk, PT', 'POSEIDON CORPORATE SERVICES LTD', 'PT CIPTADANA SEKURITAS ASIA', null, 'A', null, 'SEYCHELLES', 0, 0, 9461314663, 0, 55.64, '2026-08-13'),
  ('UNSP', 5, 'BAKRIE SUMATERA PLANTATIONS Tbk, PT', 'UNBOUNDED OPPORTUNITIES FUND SPC', 'PT CIPTADANA SEKURITAS ASIA', null, 'A', null, 'CAYMAN ISLANDS', 0, 0, 3005863413, 0, 17.68, '2026-08-13'),
  ('UNSP', 5, 'BAKRIE SUMATERA PLANTATIONS Tbk, PT', 'PT BAKRIE CAPITAL INDONESIA', 'SAMUEL SEKURITAS INDONESIA, PT', null, 'L', null, 'INDONESIA', 0, 0, 886785948, 0, 5.21, '2026-08-13'),
  ('UNTR', 5, 'UNITED TRACTORS Tbk, PT', 'PT UNITED TRACTORS TBK', 'BANK RAKYAT INDONESIA (PERSERO), PT', null, 'L', null, 'INDONESIA', 0, 0, 270196100, 1232300, 7.24, '2026-08-13'),
  ('URBN', 5, 'URBAN JAKARTA PROPERTINDO Tbk, PT', 'PT. Nusa Wijaya Propertindo', 'BUT DEUTSCHE BANK AG', null, 'L', null, 'INDONESIA', 0, 0, 2401409999, 0, 74.3, '2026-08-13'),
  ('URBN', 5, 'URBAN JAKARTA PROPERTINDO Tbk, PT', 'IBUKOTA DEVELOPMENT LTD', 'SINARMAS SEKURITAS, PT', null, 'A', null, 'VIRGIN ISLANDS, BRITISH', 0, 0, 310712500, 0, 9.61, '2026-08-13'),
  ('UVCR', 5, 'TRIMEGAH KARYA PRATAMA Tbk, PT', 'PT TRIMEGAH SUMBER MAS', 'PT KB VALBURY SEKURITAS', null, 'L', null, 'INDONESIA', 0, 0, 623557467, 0, 31.18, '2026-08-13'),
  ('VERN', 5, 'VERONA INDAH PICTURES Tbk, PT', 'PIE TITIN SURYANI', 'PT KAY HIAN SEKURITAS', null, 'L', null, 'INDONESIA', 0, 0, 2222325000, 0, 46.63, '2026-08-13'),
  ('VERN', 5, 'VERONA INDAH PICTURES Tbk, PT', 'BEDY KUNADY', 'PT KAY HIAN SEKURITAS', null, 'L', null, 'INDONESIA', 0, 0, 1408925000, 0, 29.56, '2026-08-13'),
  ('VERN', 5, 'VERONA INDAH PICTURES Tbk, PT', 'ANGELIA PUSPITASARI', 'PT SUCOR SEKURITAS', null, 'L', null, 'INDONESIA', 0, 0, 244986500, 0, 5.14, '2026-08-13'),
  ('VICI', 5, 'VICTORIA CARE INDONESIA Tbk, PT', 'PT SUKSES SEJATI SEJAHTERA', 'BUT. STANDARD CHARTERED BANK', null, 'L', null, 'INDONESIA', 0, 0, 4021380000, 0, 59.95, '2026-08-13'),
  ('VICI', 5, 'VICTORIA CARE INDONESIA Tbk, PT', 'BEAUTY BRANDS INTERNATIONAL PTE LTD', 'BUT. STANDARD CHARTERED BANK', null, 'A', null, 'SINGAPORE', 0, 0, 1677000000, 0, 25, '2026-08-13'),
  ('VICO', 5, 'VICTORIA INVESTAMA Tbk. PT', 'PT Gratamulia Pratama', 'PT VICTORIA SEKURITAS INDONESIA', null, 'L', null, 'INDONESIA', 0, 0, 6856943900, 0, 45.06, '2026-08-13'),
  ('VICO', 5, 'VICTORIA INVESTAMA Tbk. PT', 'SUZANNA TANOJO', 'BUT DEUTSCHE BANK AG', null, 'L', null, 'INDONESIA', 0, 0, 4050858438, 0, 26.62, '2026-08-13'),
  ('VINS', 5, 'VICTORIA INSURANCE Tbk, PT', 'PT VICTORIA INVESTAMA TBK', 'PT VICTORIA SEKURITAS INDONESIA', null, 'L', null, 'INDONESIA', 0, 0, 1319359038, 0, 84.93, '2026-08-13'),
  ('VISI', 5, 'SATU VISI PUTRA Tbk, PT', 'HARMONI SEMESTA INVESTAMA PT', 'PT. TRIMEGAH SEKURITAS INDONESIA TBK', null, 'L', null, 'INDONESIA', 0, 0, 1901580000, 0, 61.84, '2026-08-13'),
  ('VISI', 5, 'SATU VISI PUTRA Tbk, PT', 'ATLAS RAYA ABADI PT', 'PT. TRIMEGAH SEKURITAS INDONESIA TBK', null, 'L', null, 'INDONESIA', 0, 0, 312420000, 0, 10.16, '2026-08-13'),
  ('VISI', 5, 'SATU VISI PUTRA Tbk, PT', 'TRINUGRAHA THOHIR HARMONI, PT', 'PT. TRIMEGAH SEKURITAS INDONESIA TBK', null, 'L', null, 'INDONESIA', 0, 0, 246000000, 0, 8, '2026-08-13'),
  ('VIVA', 5, 'VISI MEDIA ASIA Tbk, PT', 'PT. Bakrie Global Ventura', 'PT CGS International Sekuritas Indonesia', null, 'L', null, 'INDONESIA', 0, 0, 5372678910, 0, 32.63, '2026-08-13'),
  ('VIVA', 5, 'VISI MEDIA ASIA Tbk, PT', 'SURYA GANESA AMANI, PT', 'PT CIPTADANA SEKURITAS ASIA', null, 'L', null, 'INDONESIA', 0, 0, 1135863245, 0, 6.9, '2026-08-13'),
  ('VIVA', 5, 'VISI MEDIA ASIA Tbk, PT', 'UBS AG HONGKONG', 'BUT DEUTSCHE BANK AG', null, 'A', null, 'HONG KONG', 0, 0, 828013500, 0, 5.03, '2026-08-13'),
  ('VKTR', 5, 'VKTR TEKNOLOGI MOBILITAS Tbk, PT', 'BAKRIE & BROTHERS TBK, PT', 'PT CIPTADANA SEKURITAS ASIA', null, 'L', null, 'INDONESIA', 0, 0, 10676843318, 0, 24.4, '2026-08-13'),
  ('VKTR', 5, 'VKTR TEKNOLOGI MOBILITAS Tbk, PT', 'Bakrie Metal Industries, PT', 'PT BNC SEKURITAS INDONESIA', null, 'L', null, 'INDONESIA', 0, 0, 6214036759, 0, 14.2, '2026-08-13'),
  ('VOKS', 5, 'VOKSEL ELECTRIC Tbk, PT', 'HENGTONG OPTIC ELECTRIC INTERNATIONAL CO., LIMITED', 'PT BANK DBS INDONESIA', null, 'A', null, 'HONG KONG', 0, 0, 2271920320, 0, 54.67, '2026-08-13'),
  ('VOKS', 5, 'VOKSEL ELECTRIC Tbk, PT', 'DBS VICKERS (HONG KONG) LIMITED A/C CLIENT', 'PT BANK DBS INDONESIA', null, 'A', null, 'HONG KONG', 0, 0, 1046500000, 0, 25.18, '2026-08-13'),
  ('VRNA', 5, 'MIZUHO LEASING INDONESIA Tbk, PT', 'MIZUHO LEASING CO LTD', 'BNI SEKURITAS, PT', null, 'A', null, 'JAPAN', 0, 0, 3835346804, 0, 67.44, '2026-08-13'),
  ('VRNA', 5, 'MIZUHO LEASING INDONESIA Tbk, PT', 'BANK PAN INDONESIA TBK, PT', 'PT FAC SEKURITAS INDONESIA', null, 'L', null, 'INDONESIA', 0, 0, 1290064004, 0, 22.68, '2026-08-13'),
  ('VRNA', 5, 'MIZUHO LEASING INDONESIA Tbk, PT', 'Panin Bank Tbk, PT', 'PT FAC SEKURITAS INDONESIA', null, 'L', null, 'INDONESIA', 0, 0, 1290064004, 0, 22.68, '2026-08-13'),
  ('VTNY', 5, 'VENTENY FORTUNA INTERNATIONAL Tbk, PT', 'CARTA HOLDINGS Co., Ltd.', 'PT SURYA FAJAR SEKURITAS', null, 'A', null, 'JAPAN', 0, 0, 1319341020, 0, 21.06, '2026-08-13'),
  ('VTNY', 5, 'VENTENY FORTUNA INTERNATIONAL Tbk, PT', 'JUNICHIRO WAIDE', 'PT SURYA FAJAR SEKURITAS', null, 'L', null, 'INDONESIA', 0, 0, 1256866974, 0, 20.06, '2026-08-13'),
  ('VTNY', 5, 'VENTENY FORTUNA INTERNATIONAL Tbk, PT', 'OCEAN CAPITAL, Inc.,', 'PT SURYA FAJAR SEKURITAS', null, 'A', null, 'JAPAN', 0, 0, 695736080, 0, 11.1, '2026-08-13'),
  ('VTNY', 5, 'VENTENY FORTUNA INTERNATIONAL Tbk, PT', 'FINTECH BUSINESS INNOVATION LPS', 'PT SURYA FAJAR SEKURITAS', null, 'A', null, 'JAPAN', 0, 0, 605844660, 0, 9.67, '2026-08-13'),
  ('VTNY', 5, 'VENTENY FORTUNA INTERNATIONAL Tbk, PT', 'KK INVESTMENT HOLDINGS PTE. LTD.', 'PT SURYA FAJAR SEKURITAS', null, 'A', null, 'SINGAPORE', 0, 0, 536915060, 0, 8.57, '2026-08-13'),
  ('VTNY', 5, 'VENTENY FORTUNA INTERNATIONAL Tbk, PT', 'RELO CLUB, LIMITED', 'PT SURYA FAJAR SEKURITAS', null, 'A', null, 'JAPAN', 0, 0, 470454560, 0, 7.51, '2026-08-13'),
  ('WAPO', 5, 'PT. WAHANA PRONATURAL Tbk', 'HIJAU SARI PT.', 'PT FORTE GLOBAL SEKURITAS', null, 'L', null, 'INDONESIA', 0, 0, 447562500, 0, 36.07, '2026-08-13'),
  ('WAPO', 5, 'PT. WAHANA PRONATURAL Tbk', 'PT. Mitra Niaga Sakti', 'PT FORTE GLOBAL SEKURITAS', null, 'L', null, 'INDONESIA', 0, 0, 402562500, 0, 32.44, '2026-08-13'),
  ('WAPO', 5, 'PT. WAHANA PRONATURAL Tbk', 'PT. SURYA PELANGI MANDIRI', 'PT FORTE GLOBAL SEKURITAS', null, 'L', null, 'INDONESIA', 0, 0, 100000000, 0, 8.06, '2026-08-13'),
  ('WEHA', 5, 'WEHA TRANSPORTASI INDONESIA Tbk, PT', 'PT PANORAMA SENTRAWISATA TBK', 'PT WATERFRONT SEKURITAS INDONESIA', null, 'L', null, 'INDONESIA', 0, 0, 766517000, 0, 52.48, '2026-08-13'),
  ('WEHA', 5, 'WEHA TRANSPORTASI INDONESIA Tbk, PT', 'WEHA INVESTAMA,PT', 'PT WATERFRONT SEKURITAS INDONESIA', null, 'L', null, 'INDONESIA', 0, 0, 211805686, 0, 14.5, '2026-08-13'),
  ('WGSH', 5, 'WIRA GLOBAL SOLUSI Tbk, PT', 'WALDEN GLOBAL SERVICES', 'PT CGS International Sekuritas Indonesia', null, 'L', null, 'INDONESIA', 0, 0, 704293998, 0, 33.78, '2026-08-13'),
  ('WGSH', 5, 'WIRA GLOBAL SOLUSI Tbk, PT', 'IKIN WIRAWAN', 'PT BCA SEKURITAS', null, 'L', null, 'INDONESIA', 0, 0, 258140000, 0, 12.38, '2026-08-13'),
  ('WGSH', 5, 'WIRA GLOBAL SOLUSI Tbk, PT', 'PT WYNFIELD GLOBAL VENTURES', 'PT CGS International Sekuritas Indonesia', null, 'L', null, 'INDONESIA', 0, 0, 233622000, 0, 11.2, '2026-08-13'),
  ('WGSH', 5, 'WIRA GLOBAL SOLUSI Tbk, PT', 'PT. PUSAKA MAS PERSADA', 'PANIN SEKURITAS Tbk, PT', null, 'L', null, 'INDONESIA', 0, 0, 193553202, 0, 9.28, '2026-08-13'),
  ('WGSH', 5, 'WIRA GLOBAL SOLUSI Tbk, PT', 'PT SILICON VALLEY CONNECTION', 'PT Shinhan Sekuritas Indonesia', null, 'L', null, 'INDONESIA', 0, 0, 157240000, 0, 7.54, '2026-08-13'),
  ('WICO', 5, 'WICAKSANA OVERSEAS INTERNATIONAL Tbk, PT', 'CTLA SAFEKEEPING ACCOUNT DKSH HOLDING LTD', 'PT Bank HSBC Indonesia', null, 'A', null, 'SWITZERLAND', 0, 0, 2286096532, 0, 95.5, '2026-08-13'),
  ('WIDI', 5, 'WIDIANT JAYA KRENINDO Tbk, PT', 'BERNARD WIDIANTO', 'PT SUCOR SEKURITAS', null, 'L', null, 'INDONESIA', 0, 0, 124400000, 0, 7.77, '2026-08-13'),
  ('WIFI', 5, 'SOLUSI SINERGI DIGITAL Tbk, PT', 'INVESTASI SUKSES BERSAMA PT', 'PT RHB SEKURITAS INDONESIA', null, 'L', null, 'INDONESIA', 0, 0, 2889087404, 0, 54.42, '2026-08-13'),
  ('WIFI', 5, 'SOLUSI SINERGI DIGITAL Tbk, PT', 'DJONI', 'BRI DANAREKSA SEKURITAS, PT', null, 'L', null, 'INDONESIA', 0, 0, 280300000, 300, 5.28, '2026-08-13'),
  ('WIIM', 5, 'WISMILAK INTI MAKMUR Tbk', 'INDAHTATI WIDJAJADI', 'PT RHB SEKURITAS INDONESIA', null, 'L', null, 'INDONESIA', 0, 0, 178664065, 0, 8.51, '2026-08-13')
on conflict (ticker, disclosure_threshold, investor_name, account_holder, report_date) do update set shares = excluded.shares, share_change = excluded.share_change, percentage = excluded.percentage, scripless_shares = excluded.scripless_shares, scrip_shares = excluded.scrip_shares;

insert into public.shareholder_ownership (ticker, disclosure_threshold, issuer_name, investor_name, account_holder, classification, local_foreign, nationality, domicile, scripless_shares, scrip_shares, shares, share_change, percentage, report_date) values
  ('WIIM', 5, 'WISMILAK INTI MAKMUR Tbk', 'RONALD WALLA', 'CITIBANK, N. A', null, 'L', null, 'INDONESIA', 0, 0, 115498241, 0, 5.5, '2026-08-13'),
  ('WIIM', 5, 'WISMILAK INTI MAKMUR Tbk', 'STEPHEN WALLA', 'CITIBANK, N. A', null, 'L', null, 'INDONESIA', 0, 0, 115110341, 0, 5.48, '2026-08-13'),
  ('WINE', 5, 'HATTEN BALI Tbk, PT', 'UOB KAY HIAN PTE LTD', 'PT KAY HIAN SEKURITAS', null, 'A', null, 'SINGAPORE', 0, 0, 196386000, 0, 7.25, '2026-08-13'),
  ('WINR', 5, 'WINNER NUSANTARA JAYA Tbk, PT', 'PT. PEMENANG NUSANTARA INTERNASIONAL', 'PT SUCOR SEKURITAS', null, 'L', null, 'INDONESIA', 0, 0, 2625294000, 0, 50.15, '2026-08-13'),
  ('WINS', 5, 'WINTERMAR OFFSHORE MARINE Tbk, PT', 'PT WINTERMARJAYA LESTARI', 'PT CGS International Sekuritas Indonesia', null, 'L', null, 'INDONESIA', 0, 0, 382782813, 0, 8.46, '2026-08-13'),
  ('WINS', 5, 'WINTERMAR OFFSHORE MARINE Tbk, PT', 'JOHNSON WILLIANG SUTJIPTO', 'MANDIRI SEKURITAS, PT', null, 'L', null, 'INDONESIA', 0, 0, 337631422, 0, 7.46, '2026-08-13'),
  ('WINS', 5, 'WINTERMAR OFFSHORE MARINE Tbk, PT', 'SUGIMAN LAYANTO', 'PT OCBC SEKURITAS INDONESIA', null, 'L', null, 'INDONESIA', 0, 0, 324477724, 0, 7.17, '2026-08-13'),
  ('WINS', 5, 'WINTERMAR OFFSHORE MARINE Tbk, PT', 'MANOJ PITAMBER NANWANI', 'PT CGS International Sekuritas Indonesia', null, 'L', null, 'INDONESIA', 0, 0, 268413503, 0, 5.93, '2026-08-13'),
  ('WINS', 5, 'WINTERMAR OFFSHORE MARINE Tbk, PT', 'PINKY NK', 'PT SEMESTA INDOVEST SEKURITAS', null, 'L', null, 'INDONESIA', 0, 0, 249875968, 0, 5.52, '2026-08-13'),
  ('WMPP', 5, 'WIDODO MAKMUR PERKASA Tbk, PT', 'TUMIYANA', 'PT KB VALBURY SEKURITAS', null, 'L', null, 'INDONESIA', 0, 0, 9644587910, 0, 32.78, '2026-08-13'),
  ('WMPP', 5, 'WIDODO MAKMUR PERKASA Tbk, PT', 'RED DRAGON CAPITAL LTD', 'SAMUEL SEKURITAS INDONESIA, PT', null, 'A', null, 'VIRGIN ISLANDS, BRITISH', 0, 0, 1915475100, 0, 6.51, '2026-08-13'),
  ('WMUU', 5, 'WIDODO MAKMUR UNGGAS Tbk, PT', 'WIDODO MAKMUR PERKASA TBK, PT', 'PT SURYA FAJAR SEKURITAS', null, 'L', null, 'INDONESIA', 0, 0, 3547794328, 0, 27.41, '2026-08-13'),
  ('WOMF', 5, 'WAHANA OTTOMITRA MULTIARTHA Tbk, PT', 'PT BANK MAYBANK INDONESIA TBK', 'PT MAYBANK SEKURITAS INDONESIA', null, 'L', null, 'INDONESIA', 0, 0, 2349646729, 0, 67.49, '2026-08-13'),
  ('WOMF', 5, 'WAHANA OTTOMITRA MULTIARTHA Tbk, PT', 'PT. WAHANA MAKMUR SEJATI', 'PT NH KORINDO SEKURITAS INDONESIA', null, 'L', null, 'INDONESIA', 0, 0, 870600000, 0, 25.01, '2026-08-13'),
  ('WOOD', 5, 'INTEGRA INDOCABINET Tbk, PT', 'PT INTEGRA INDO LESTARI', 'PT BCA SEKURITAS', null, 'L', null, 'INDONESIA', 0, 0, 1096335000, 0, 17.03, '2026-08-13'),
  ('WOWS', 5, 'GINTING JAYA ENERGI Tbk, PT', 'PT. Ginting Jaya', 'PT SURYA FAJAR SEKURITAS', null, 'L', null, 'INDONESIA', 0, 0, 1050673048, 0, 42.44, '2026-08-13'),
  ('WSBP', 5, 'WASKITA BETON PRECAST Tbk, PT', 'INTINIAGA SUKSES ABADI PT', 'BNI SEKURITAS, PT', null, 'L', null, 'INDONESIA', 0, 0, 3918646978, 0, 6.88, '2026-08-13'),
  ('YELO', 5, 'YELOOO INTEGRA DATANET Tbk, PT', 'PT ARTALINDO SEMESTA NUSANTARA', 'PT Yakin Bertumbuh Sekuritas', null, 'L', null, 'INDONESIA', 0, 0, 698799998, 0, 36.53, '2026-08-13'),
  ('YOII', 5, 'ASURANSI DIGITAL BERSAMA Tbk, PT', 'ADI WIBOWO ADISAPUTRO', 'PT RELIANCE SEKURITAS INDONESIA, TBK', null, 'L', null, 'INDONESIA', 0, 0, 1448710000, 0, 36.89, '2026-08-13'),
  ('YOII', 5, 'ASURANSI DIGITAL BERSAMA Tbk, PT', 'DJAJUS ADISAPUTRO', 'PT RELIANCE SEKURITAS INDONESIA, TBK', null, 'L', null, 'INDONESIA', 0, 0, 934110000, 0, 23.79, '2026-08-13'),
  ('YOII', 5, 'ASURANSI DIGITAL BERSAMA Tbk, PT', 'QOALA TECHNOLOGY PTE LTD', 'PT RELIANCE SEKURITAS INDONESIA, TBK', null, 'A', null, 'SINGAPORE', 0, 0, 595581775, 0, 15.17, '2026-08-13'),
  ('YPAS', 5, 'YANAPRIMA HASTAPERSADA Tbk, PT', 'PT HASTAGRAHA BUMIPERSADA', 'SINARMAS SEKURITAS, PT', null, 'L', null, 'INDONESIA', 0, 0, 597650500, 0, 89.47, '2026-08-13'),
  ('YULE', 5, 'YULIE SEKURITAS INDONESIA Tbk, PT', 'PT YULIE SEKURITAS INDONESIA TBK', 'PT YULIE SEKURITAS INDONESIA TBK', null, 'L', null, 'INDONESIA', 0, 0, 197713200, 0, 11.08, '2026-08-13'),
  ('YULE', 5, 'YULIE SEKURITAS INDONESIA Tbk, PT', 'PT. Gema Buana Indonesia', 'PT INA SEKURITAS INDONESIA', null, 'L', null, 'INDONESIA', 0, 0, 178214304, 0, 9.98, '2026-08-13'),
  ('YULE', 5, 'YULIE SEKURITAS INDONESIA Tbk, PT', 'Sabrina Evelyn Elian', 'PT INA SEKURITAS INDONESIA', null, 'L', null, 'INDONESIA', 0, 0, 90146416, 0, 5.05, '2026-08-13'),
  ('YUPI', 5, 'YUPI INDO JELLY GUM Tbk, PT', 'CONFECTIONERY CONSUMER PRODUCTS INDONESIA', 'MANDIRI SEKURITAS, PT', null, 'L', null, 'INDONESIA', 0, 0, 7690039800, 0, 90, '2026-08-13'),
  ('ZATA', 5, 'BERSAMA ZATTA JAYA Tbk, PT', 'LEMBUR SADAYA INVESTAMA, PT', 'PT ROYAL INVESTIUM SEKURITAS (TAMP)', null, 'L', null, 'INDONESIA', 0, 0, 5837675422, 0, 68.71, '2026-08-13'),
  ('ZBRA', 5, 'PT. DOSNI ROHA INDONESIA Tbk', 'PT TRINITY HEALTHCARE', 'BUMIPUTERA SEKURITAS, PT', null, 'L', null, 'INDONESIA', 0, 0, 1556871192, 0, 62.01, '2026-08-13'),
  ('ZBRA', 5, 'PT. DOSNI ROHA INDONESIA Tbk', 'PT MAYBANK SEKURITAS INDONESIA - REGISTRAR', 'PT MAYBANK SEKURITAS INDONESIA', null, 'L', null, 'INDONESIA', 0, 0, 387223800, 0, 15.42, '2026-08-13'),
  ('ZINC', 5, 'KAPUAS PRIMA COAL Tbk, PT', 'SIM ANTONY', 'BANK MANDIRI, PT - CUSTODY', null, 'L', null, 'INDONESIA', 0, 0, 3639992000, 0, 14.42, '2026-08-13'),
  ('ZINC', 5, 'KAPUAS PRIMA COAL Tbk, PT', 'KIOE NATA', 'BANK MANDIRI, PT - CUSTODY', null, 'L', null, 'INDONESIA', 0, 0, 3113992000, 0, 12.33, '2026-08-13'),
  ('ZINC', 5, 'KAPUAS PRIMA COAL Tbk, PT', 'BUDIMULIO UTOMO', 'BANK MANDIRI, PT - CUSTODY', null, 'L', null, 'INDONESIA', 0, 0, 2562000000, 0, 10.15, '2026-08-13'),
  ('ZINC', 5, 'KAPUAS PRIMA COAL Tbk, PT', 'PT SARANA INTI SELARAS', 'PT PHILLIP SEKURITAS INDONESIA', null, 'L', null, 'INDONESIA', 0, 0, 2470509344, 0, 9.78, '2026-08-13'),
  ('ZINC', 5, 'KAPUAS PRIMA COAL Tbk, PT', 'WILLIAM', 'BANK MANDIRI, PT - CUSTODY', null, 'L', null, 'INDONESIA', 0, 0, 2314000000, 0, 9.16, '2026-08-13'),
  ('ZINC', 5, 'KAPUAS PRIMA COAL Tbk, PT', 'UBS SWITZERLAND AG', 'BUT DEUTSCHE BANK AG', null, 'A', null, 'SWITZERLAND', 0, 0, 1288003580, 0, 5.1, '2026-08-13'),
  ('ZONE', 5, 'MEGA PERINTIS Tbk, PT', 'TANCORP INVESTAMA MULIA, PT', 'PT WATERFRONT SEKURITAS INDONESIA', null, 'L', null, 'INDONESIA', 0, 0, 205797000, 0, 23.65, '2026-08-13')
on conflict (ticker, disclosure_threshold, investor_name, account_holder, report_date) do update set shares = excluded.shares, share_change = excluded.share_change, percentage = excluded.percentage, scripless_shares = excluded.scripless_shares, scrip_shares = excluded.scrip_shares;

insert into public.accumulation_scores (ticker, period, score, broker_score, volume_score, price_score, score_date) values
  ('TOSK', '1M', 63, null, null, null, '2026-08-12'),
  ('TOSK', '3M', 87, null, null, null, '2026-08-12'),
  ('TOSK', '6M', 82, null, null, null, '2026-08-12'),
  ('LAPD', '1M', 57, null, null, null, '2026-08-12'),
  ('LAPD', '3M', 81, null, null, null, '2026-08-12'),
  ('LAPD', '6M', 74, null, null, null, '2026-08-12'),
  ('AMMN', '1M', 62, null, null, null, '2026-08-12'),
  ('AMMN', '3M', 79, null, null, null, '2026-08-12'),
  ('AMMN', '6M', 70, null, null, null, '2026-08-12'),
  ('BREN', '1M', 61, null, null, null, '2026-08-12'),
  ('BREN', '3M', 78, null, null, null, '2026-08-12'),
  ('BREN', '6M', 72, null, null, null, '2026-08-12'),
  ('ADRO', '1M', 59, null, null, null, '2026-08-12'),
  ('ADRO', '3M', 76, null, null, null, '2026-08-12'),
  ('ADRO', '6M', 68, null, null, null, '2026-08-12')
on conflict (ticker, period, score_date) do update set score = excluded.score, broker_score = excluded.broker_score, volume_score = excluded.volume_score, price_score = excluded.price_score;

insert into public.broker_activities (ticker, broker_code, net_buy, average_price, buy_days, sell_days, consistency, period, activity_date) values
  ('TOSK', 'BK', 21300000000, 158, 41, null, 79, '3M', '2026-08-12'),
  ('TOSK', 'YP', 14800000000, 163, 38, null, 76, '3M', '2026-08-12'),
  ('TOSK', 'CC', 9700000000, 156, 35, null, 70, '3M', '2026-08-12'),
  ('TOSK', 'ZP', 6500000000, 162, 30, null, 68, '3M', '2026-08-12'),
  ('TOSK', 'AK', 4200000000, 159, 26, null, 65, '3M', '2026-08-12'),
  ('LAPD', 'BK', 21300000000, 158, 41, null, 79, '3M', '2026-08-12'),
  ('LAPD', 'YP', 14800000000, 163, 38, null, 76, '3M', '2026-08-12'),
  ('LAPD', 'CC', 9700000000, 156, 35, null, 70, '3M', '2026-08-12'),
  ('LAPD', 'ZP', 6500000000, 162, 30, null, 68, '3M', '2026-08-12'),
  ('LAPD', 'AK', 4200000000, 159, 26, null, 65, '3M', '2026-08-12'),
  ('WEGE', 'BK', 21300000000, 158, 41, null, 79, '3M', '2026-08-12'),
  ('WEGE', 'YP', 14800000000, 163, 38, null, 76, '3M', '2026-08-12'),
  ('WEGE', 'CC', 9700000000, 156, 35, null, 70, '3M', '2026-08-12'),
  ('WEGE', 'ZP', 6500000000, 162, 30, null, 68, '3M', '2026-08-12'),
  ('WEGE', 'AK', 4200000000, 159, 26, null, 65, '3M', '2026-08-12'),
  ('WMPP', 'BK', 21300000000, 158, 41, null, 79, '3M', '2026-08-12'),
  ('WMPP', 'YP', 14800000000, 163, 38, null, 76, '3M', '2026-08-12'),
  ('WMPP', 'CC', 9700000000, 156, 35, null, 70, '3M', '2026-08-12'),
  ('WMPP', 'ZP', 6500000000, 162, 30, null, 68, '3M', '2026-08-12'),
  ('WMPP', 'AK', 4200000000, 159, 26, null, 65, '3M', '2026-08-12'),
  ('BREN', 'BK', 21300000000, 158, 41, null, 79, '3M', '2026-08-12'),
  ('BREN', 'YP', 14800000000, 163, 38, null, 76, '3M', '2026-08-12'),
  ('BREN', 'CC', 9700000000, 156, 35, null, 70, '3M', '2026-08-12'),
  ('BREN', 'ZP', 6500000000, 162, 30, null, 68, '3M', '2026-08-12'),
  ('BREN', 'AK', 4200000000, 159, 26, null, 65, '3M', '2026-08-12'),
  ('ADRO', 'BK', 21300000000, 158, 41, null, 79, '3M', '2026-08-12'),
  ('ADRO', 'YP', 14800000000, 163, 38, null, 76, '3M', '2026-08-12'),
  ('ADRO', 'CC', 9700000000, 156, 35, null, 70, '3M', '2026-08-12'),
  ('ADRO', 'ZP', 6500000000, 162, 30, null, 68, '3M', '2026-08-12'),
  ('ADRO', 'AK', 4200000000, 159, 26, null, 65, '3M', '2026-08-12'),
  ('AMMN', 'BK', 21300000000, 158, 41, null, 79, '3M', '2026-08-12'),
  ('AMMN', 'YP', 14800000000, 163, 38, null, 76, '3M', '2026-08-12'),
  ('AMMN', 'CC', 9700000000, 156, 35, null, 70, '3M', '2026-08-12'),
  ('AMMN', 'ZP', 6500000000, 162, 30, null, 68, '3M', '2026-08-12'),
  ('AMMN', 'AK', 4200000000, 159, 26, null, 65, '3M', '2026-08-12'),
  ('CPIN', 'BK', 21300000000, 158, 41, null, 79, '3M', '2026-08-12'),
  ('CPIN', 'YP', 14800000000, 163, 38, null, 76, '3M', '2026-08-12'),
  ('CPIN', 'CC', 9700000000, 156, 35, null, 70, '3M', '2026-08-12'),
  ('CPIN', 'ZP', 6500000000, 162, 30, null, 68, '3M', '2026-08-12'),
  ('CPIN', 'AK', 4200000000, 159, 26, null, 65, '3M', '2026-08-12'),
  ('BBNI', 'BK', 21300000000, 158, 41, null, 79, '3M', '2026-08-12'),
  ('BBNI', 'YP', 14800000000, 163, 38, null, 76, '3M', '2026-08-12'),
  ('BBNI', 'CC', 9700000000, 156, 35, null, 70, '3M', '2026-08-12'),
  ('BBNI', 'ZP', 6500000000, 162, 30, null, 68, '3M', '2026-08-12'),
  ('BBNI', 'AK', 4200000000, 159, 26, null, 65, '3M', '2026-08-12'),
  ('BRPT', 'BK', 21300000000, 158, 41, null, 79, '3M', '2026-08-12'),
  ('BRPT', 'YP', 14800000000, 163, 38, null, 76, '3M', '2026-08-12'),
  ('BRPT', 'CC', 9700000000, 156, 35, null, 70, '3M', '2026-08-12'),
  ('BRPT', 'ZP', 6500000000, 162, 30, null, 68, '3M', '2026-08-12'),
  ('BRPT', 'AK', 4200000000, 159, 26, null, 65, '3M', '2026-08-12')
on conflict (ticker, broker_code, period, activity_date) do update set net_buy = excluded.net_buy, average_price = excluded.average_price, buy_days = excluded.buy_days, sell_days = excluded.sell_days, consistency = excluded.consistency;

insert into public.corporate_action_events (id, ticker, action_type, event_date, state, topic, announcement_price, document_label) values
  ('tosk-rupslb-2026', 'TOSK', 'RUPSLB', '2026-08-22', 'Mendatang', 'Perubahan susunan pengurus dan persetujuan rencana pengembangan usaha.', 168, 'Pemanggilan RUPSLB'),
  ('bren-rupst-2026', 'BREN', 'RUPST', '2026-08-27', 'Mendatang', 'Persetujuan laporan tahunan, penggunaan laba, dan arahan ekspansi.', 8050, 'Agenda RUPST'),
  ('lapd-pubex-2026', 'LAPD', 'Public Expose', '2026-08-19', 'Mendatang', 'Paparan kinerja dan perkembangan kegiatan operasional perseroan.', 98, 'Materi Public Expose'),
  ('ammn-rupst-2026', 'AMMN', 'RUPST', '2026-08-15', 'Selesai', 'Persetujuan laporan tahunan dan pembaruan rencana belanja modal.', 9150, 'Ringkasan Risalah RUPST'),
  ('adro-rupslb-2026', 'ADRO', 'RUPSLB', '2026-08-08', 'Selesai', 'Persetujuan transaksi material dan perubahan penggunaan dana.', 2380, 'Ringkasan Risalah RUPSLB')
on conflict (id) do update set ticker = excluded.ticker, action_type = excluded.action_type, event_date = excluded.event_date, state = excluded.state, topic = excluded.topic, announcement_price = excluded.announcement_price, document_label = excluded.document_label;

insert into public.corporate_action_events (id, ticker, action_type, event_date, state, topic, announcement_price, document_label, document_number) values
  ('dividend-ksei-20885-jku-0826', 'INPP', 'Dividen Tunai', '2026-08-12', 'Selesai', 'Jadwal Pelaksanaan Pembagian Dividen Interim atas Efek INDONESIAN PARADISE PROPERTY Tbk (INPP).', null, 'Dokumen KSEI', 'KSEI-20885/JKU/0826'),
  ('dividend-ksei-20685-jku-0826', 'HUMI', 'Dividen Tunai', '2026-08-10', 'Selesai', 'Informasi Tambahan Dividen Tunai HUMPUSS MARITIM INTERNASIONAL Tbk (HUMI).', null, 'Dokumen KSEI', 'KSEI-20685/JKU/0826'),
  ('dividend-ksei-20505-jku-0826', 'MARK', 'Dividen Tunai', '2026-08-06', 'Selesai', 'Jadwal Pelaksanaan Pembagian Dividen Interim atas Efek MARK DYNAMICS INDONESIA Tbk (MARK).', null, 'Dokumen KSEI', 'KSEI-20505/JKU/0826'),
  ('dividend-ksei-20450-jku-0826', null, 'Dividen Tunai', '2026-08-06', 'Selesai', 'Jadwal Pelaksanaan Pembagian Dividen Interim ECF PT BANGUN BISNIS BERSAMA.', null, 'Dokumen KSEI', 'KSEI-20450/JKU/0826'),
  ('dividend-ksei-20373-jku-0826', 'IKBI', 'Dividen Tunai', '2026-08-05', 'Selesai', 'Jadwal Pelaksanaan Pembagian Dividen Tunai atas Efek SUMI INDO KABEL Tbk (IKBI).', null, 'Dokumen KSEI', 'KSEI-20373/JKU/0826'),
  ('dividend-ksei-20299-jku-0826', 'HUMI', 'Dividen Tunai', '2026-08-04', 'Selesai', 'Jadwal Pelaksanaan Pembagian Dividen Tunai atas Efek HUMPUSS MARITIM INTERNASIONAL Tbk (HUMI).', null, 'Dokumen KSEI', 'KSEI-20299/JKU/0826'),
  ('dividend-ksei-20297-jku-0826', 'AMAR', 'Dividen Tunai', '2026-08-04', 'Selesai', 'Jadwal Pelaksanaan Pembagian Dividen Interim atas Efek BANK AMAR INDONESIA Tbk (AMAR).', null, 'Dokumen KSEI', 'KSEI-20297/JKU/0826'),
  ('dividend-ksei-20295-jku-0826', 'TAPG', 'Dividen Tunai', '2026-08-04', 'Selesai', 'Jadwal Pelaksanaan Pembagian Dividen Interim atas Efek TRIPUTRA AGRO PERSADA Tbk (TAPG).', null, 'Dokumen KSEI', 'KSEI-20295/JKU/0826'),
  ('dividend-ksei-20293-jku-0826', 'NPGF', 'Dividen Tunai', '2026-08-04', 'Selesai', 'Jadwal Pelaksanaan Pembagian Dividen Tunai atas Efek NUSA PALAPA GEMILANG Tbk (NPGF).', null, 'Dokumen KSEI', 'KSEI-20293/JKU/0826'),
  ('dividend-ksei-20132-jku-0826', 'SMDR', 'Dividen Tunai', '2026-08-03', 'Selesai', 'Jadwal Pelaksanaan Pembagian Dividen Interim atas Efek SAMUDERA INDONESIA Tbk (SMDR).', null, 'Dokumen KSEI', 'KSEI-20132/JKU/0826')
on conflict (id) do update set ticker = excluded.ticker, action_type = excluded.action_type, event_date = excluded.event_date, state = excluded.state, topic = excluded.topic, document_label = excluded.document_label, document_number = excluded.document_number;

insert into public.stock_timeline (ticker, event_type, title, description, event_date) values
  ('TOSK', 'Change of Share Ownership', 'Change of Share Ownership', 'Timeline demo awal BandarLab.', '2026-08-12'),
  ('TOSK', 'Extraordinary RUPS', 'Extraordinary RUPS', 'Timeline demo awal BandarLab.', '2026-07-22'),
  ('TOSK', 'Material Transaction Disclosure', 'Material Transaction Disclosure', 'Timeline demo awal BandarLab.', '2026-07-05'),
  ('TOSK', 'Volume Anomaly Detected', 'Volume Anomaly Detected', 'Timeline demo awal BandarLab.', '2026-06-18'),
  ('TOSK', 'Strong Accumulation Start', 'Strong Accumulation Start', 'Timeline demo awal BandarLab.', '2026-05-28'),
  ('TOSK', 'Price Consolidation', 'Price Consolidation', 'Timeline demo awal BandarLab.', '2026-04-15')
on conflict (ticker, event_type, title, event_date) do update set description = excluded.description;

insert into public.conglomerate_groups (id, owner_id, name, description, is_system) values ('00000000-0000-4000-8000-000000000001', null, 'Prajogo Pangestu / Barito', 'Kelompok saham yang sering dipantau sebagai ekosistem Prajogo Pangestu dan Barito.', true) on conflict (id) do update set name = excluded.name, description = excluded.description, is_system = true;

insert into public.conglomerate_group_members (group_id, ticker) values
  ('00000000-0000-4000-8000-000000000001', 'BRPT'),
  ('00000000-0000-4000-8000-000000000001', 'TPIA'),
  ('00000000-0000-4000-8000-000000000001', 'BREN'),
  ('00000000-0000-4000-8000-000000000001', 'CUAN'),
  ('00000000-0000-4000-8000-000000000001', 'PTRO'),
  ('00000000-0000-4000-8000-000000000001', 'CDIA')
on conflict (group_id, ticker) do nothing;

insert into public.conglomerate_groups (id, owner_id, name, description, is_system) values ('00000000-0000-4000-8000-000000000002', null, 'Salim Group', 'Ekosistem Salim dari consumer, perkebunan, otomotif, digital, sampai properti.', true) on conflict (id) do update set name = excluded.name, description = excluded.description, is_system = true;

insert into public.conglomerate_group_members (group_id, ticker) values
  ('00000000-0000-4000-8000-000000000002', 'INDF'),
  ('00000000-0000-4000-8000-000000000002', 'ICBP'),
  ('00000000-0000-4000-8000-000000000002', 'SIMP'),
  ('00000000-0000-4000-8000-000000000002', 'LSIP'),
  ('00000000-0000-4000-8000-000000000002', 'IMAS'),
  ('00000000-0000-4000-8000-000000000002', 'IMJS'),
  ('00000000-0000-4000-8000-000000000002', 'DNET'),
  ('00000000-0000-4000-8000-000000000002', 'PANI'),
  ('00000000-0000-4000-8000-000000000002', 'CBDK')
on conflict (group_id, ticker) do nothing;

insert into public.conglomerate_groups (id, owner_id, name, description, is_system) values ('00000000-0000-4000-8000-000000000003', null, 'Sinar Mas / Widjaja', 'Kelompok Sinar Mas lintas energi, pulp and paper, agribisnis, finansial, dan properti.', true) on conflict (id) do update set name = excluded.name, description = excluded.description, is_system = true;

insert into public.conglomerate_group_members (group_id, ticker) values
  ('00000000-0000-4000-8000-000000000003', 'DSSA'),
  ('00000000-0000-4000-8000-000000000003', 'INKP'),
  ('00000000-0000-4000-8000-000000000003', 'TKIM'),
  ('00000000-0000-4000-8000-000000000003', 'SMAR'),
  ('00000000-0000-4000-8000-000000000003', 'SMMA'),
  ('00000000-0000-4000-8000-000000000003', 'BSIM'),
  ('00000000-0000-4000-8000-000000000003', 'DMAS')
on conflict (group_id, ticker) do nothing;

insert into public.conglomerate_groups (id, owner_id, name, description, is_system) values ('00000000-0000-4000-8000-000000000004', null, 'Djarum / Hartono', 'Kelompok saham yang terkait ekosistem Hartono dari bank, menara, digital, dan data center.', true) on conflict (id) do update set name = excluded.name, description = excluded.description, is_system = true;

insert into public.conglomerate_group_members (group_id, ticker) values
  ('00000000-0000-4000-8000-000000000004', 'BBCA'),
  ('00000000-0000-4000-8000-000000000004', 'TOWR'),
  ('00000000-0000-4000-8000-000000000004', 'SUPR'),
  ('00000000-0000-4000-8000-000000000004', 'BELI'),
  ('00000000-0000-4000-8000-000000000004', 'DATA'),
  ('00000000-0000-4000-8000-000000000004', 'BACH')
on conflict (group_id, ticker) do nothing;

insert into public.conglomerate_groups (id, owner_id, name, description, is_system) values ('00000000-0000-4000-8000-000000000005', null, 'Bakrie Group', 'Kelompok saham yang terkait ekosistem Bakrie dan afiliasi pasar yang sering dipantau.', true) on conflict (id) do update set name = excluded.name, description = excluded.description, is_system = true;

insert into public.conglomerate_group_members (group_id, ticker) values
  ('00000000-0000-4000-8000-000000000005', 'BNBR'),
  ('00000000-0000-4000-8000-000000000005', 'BUMI'),
  ('00000000-0000-4000-8000-000000000005', 'BRMS'),
  ('00000000-0000-4000-8000-000000000005', 'ENRG'),
  ('00000000-0000-4000-8000-000000000005', 'DEWA'),
  ('00000000-0000-4000-8000-000000000005', 'ELTY'),
  ('00000000-0000-4000-8000-000000000005', 'UNSP'),
  ('00000000-0000-4000-8000-000000000005', 'VKTR'),
  ('00000000-0000-4000-8000-000000000005', 'VIVA'),
  ('00000000-0000-4000-8000-000000000005', 'MDIA'),
  ('00000000-0000-4000-8000-000000000005', 'JGLE'),
  ('00000000-0000-4000-8000-000000000005', 'ALII'),
  ('00000000-0000-4000-8000-000000000005', 'KOTA')
on conflict (group_id, ticker) do nothing;

insert into public.conglomerate_groups (id, owner_id, name, description, is_system) values ('00000000-0000-4000-8000-000000000006', null, 'Happy Hapsoro', 'Kelompok saham yang sering dipantau dalam ekosistem Happy Hapsoro.', true) on conflict (id) do update set name = excluded.name, description = excluded.description, is_system = true;

insert into public.conglomerate_group_members (group_id, ticker) values
  ('00000000-0000-4000-8000-000000000006', 'RAJA'),
  ('00000000-0000-4000-8000-000000000006', 'RATU'),
  ('00000000-0000-4000-8000-000000000006', 'BUVA'),
  ('00000000-0000-4000-8000-000000000006', 'MINA'),
  ('00000000-0000-4000-8000-000000000006', 'PADI'),
  ('00000000-0000-4000-8000-000000000006', 'PSKT'),
  ('00000000-0000-4000-8000-000000000006', 'SINI'),
  ('00000000-0000-4000-8000-000000000006', 'UANG')
on conflict (group_id, ticker) do nothing;

insert into public.conglomerate_groups (id, owner_id, name, description, is_system) values ('00000000-0000-4000-8000-000000000007', null, 'Aguan / Agung Sedayu / PIK2', 'Kelompok saham properti yang terkait tema Agung Sedayu dan PIK2.', true) on conflict (id) do update set name = excluded.name, description = excluded.description, is_system = true;

insert into public.conglomerate_group_members (group_id, ticker) values
  ('00000000-0000-4000-8000-000000000007', 'PANI'),
  ('00000000-0000-4000-8000-000000000007', 'CBDK')
on conflict (group_id, ticker) do nothing;

insert into public.conglomerate_groups (id, owner_id, name, description, is_system) values ('00000000-0000-4000-8000-000000000008', null, 'Boy Thohir / Adaro-Alamtri', 'Ekosistem Adaro-Alamtri dan beberapa afiliasi investasi yang sering ikut dipantau.', true) on conflict (id) do update set name = excluded.name, description = excluded.description, is_system = true;

insert into public.conglomerate_group_members (group_id, ticker) values
  ('00000000-0000-4000-8000-000000000008', 'ADRO'),
  ('00000000-0000-4000-8000-000000000008', 'ADMR'),
  ('00000000-0000-4000-8000-000000000008', 'AADI'),
  ('00000000-0000-4000-8000-000000000008', 'TRIM'),
  ('00000000-0000-4000-8000-000000000008', 'ESSA'),
  ('00000000-0000-4000-8000-000000000008', 'BFIN'),
  ('00000000-0000-4000-8000-000000000008', 'WOMF'),
  ('00000000-0000-4000-8000-000000000008', 'MDKA'),
  ('00000000-0000-4000-8000-000000000008', 'PALM'),
  ('00000000-0000-4000-8000-000000000008', 'GOTO')
on conflict (group_id, ticker) do nothing;

insert into public.conglomerate_groups (id, owner_id, name, description, is_system) values ('00000000-0000-4000-8000-000000000009', null, 'Edwin Soeryadjaya / Saratoga', 'Ekosistem Saratoga dan portofolio historis yang sering masuk radar.', true) on conflict (id) do update set name = excluded.name, description = excluded.description, is_system = true;

insert into public.conglomerate_group_members (group_id, ticker) values
  ('00000000-0000-4000-8000-000000000009', 'SRTG'),
  ('00000000-0000-4000-8000-000000000009', 'ADRO'),
  ('00000000-0000-4000-8000-000000000009', 'AADI'),
  ('00000000-0000-4000-8000-000000000009', 'MDKA'),
  ('00000000-0000-4000-8000-000000000009', 'TBIG'),
  ('00000000-0000-4000-8000-000000000009', 'MPMX')
on conflict (group_id, ticker) do nothing;

insert into public.conglomerate_groups (id, owner_id, name, description, is_system) values ('00000000-0000-4000-8000-000000000010', null, 'Theodore P. Rachmat / Triputra', 'Kelompok Triputra yang masuk radar publik.', true) on conflict (id) do update set name = excluded.name, description = excluded.description, is_system = true;

insert into public.conglomerate_group_members (group_id, ticker) values
  ('00000000-0000-4000-8000-000000000010', 'TAPG'),
  ('00000000-0000-4000-8000-000000000010', 'ASSA')
on conflict (group_id, ticker) do nothing;

insert into public.conglomerate_groups (id, owner_id, name, description, is_system) values ('00000000-0000-4000-8000-000000000011', null, 'Lippo / Riady', 'Ekosistem Lippo di properti, teknologi, kesehatan, retail, dan finansial.', true) on conflict (id) do update set name = excluded.name, description = excluded.description, is_system = true;

insert into public.conglomerate_group_members (group_id, ticker) values
  ('00000000-0000-4000-8000-000000000011', 'MLPL'),
  ('00000000-0000-4000-8000-000000000011', 'MLPT'),
  ('00000000-0000-4000-8000-000000000011', 'MPPA'),
  ('00000000-0000-4000-8000-000000000011', 'LPKR'),
  ('00000000-0000-4000-8000-000000000011', 'LPCK'),
  ('00000000-0000-4000-8000-000000000011', 'SILO'),
  ('00000000-0000-4000-8000-000000000011', 'NOBU'),
  ('00000000-0000-4000-8000-000000000011', 'LPPF')
on conflict (group_id, ticker) do nothing;

insert into public.conglomerate_groups (id, owner_id, name, description, is_system) values ('00000000-0000-4000-8000-000000000012', null, 'MNC / Hary Tanoesoedibjo', 'Kelompok MNC lintas media, entertainment, finansial, properti, dan digital.', true) on conflict (id) do update set name = excluded.name, description = excluded.description, is_system = true;

insert into public.conglomerate_group_members (group_id, ticker) values
  ('00000000-0000-4000-8000-000000000012', 'BHIT'),
  ('00000000-0000-4000-8000-000000000012', 'BMTR'),
  ('00000000-0000-4000-8000-000000000012', 'MNCN'),
  ('00000000-0000-4000-8000-000000000012', 'MSIN'),
  ('00000000-0000-4000-8000-000000000012', 'IPTV'),
  ('00000000-0000-4000-8000-000000000012', 'MSKY'),
  ('00000000-0000-4000-8000-000000000012', 'KPIG'),
  ('00000000-0000-4000-8000-000000000012', 'BCAP'),
  ('00000000-0000-4000-8000-000000000012', 'BABP'),
  ('00000000-0000-4000-8000-000000000012', 'IATA')
on conflict (group_id, ticker) do nothing;

insert into public.conglomerate_groups (id, owner_id, name, description, is_system) values ('00000000-0000-4000-8000-000000000013', null, 'Chairul Tanjung / CT Corp', 'Kendaraan publik utama yang sering dipantau untuk ekosistem CT Corp.', true) on conflict (id) do update set name = excluded.name, description = excluded.description, is_system = true;

insert into public.conglomerate_group_members (group_id, ticker) values
  ('00000000-0000-4000-8000-000000000013', 'BBHI')
on conflict (group_id, ticker) do nothing;

insert into public.conglomerate_groups (id, owner_id, name, description, is_system) values ('00000000-0000-4000-8000-000000000014', null, 'Tahir / Mayapada', 'Kelompok saham yang terkait ekosistem Mayapada.', true) on conflict (id) do update set name = excluded.name, description = excluded.description, is_system = true;

insert into public.conglomerate_group_members (group_id, ticker) values
  ('00000000-0000-4000-8000-000000000014', 'MAYA'),
  ('00000000-0000-4000-8000-000000000014', 'SRAJ')
on conflict (group_id, ticker) do nothing;

insert into public.conglomerate_groups (id, owner_id, name, description, is_system) values ('00000000-0000-4000-8000-000000000015', null, 'Harita / Lim Hariyanto', 'Kelompok Harita yang masuk radar mineral dan sumber daya.', true) on conflict (id) do update set name = excluded.name, description = excluded.description, is_system = true;

insert into public.conglomerate_group_members (group_id, ticker) values
  ('00000000-0000-4000-8000-000000000015', 'NCKL'),
  ('00000000-0000-4000-8000-000000000015', 'CITA')
on conflict (group_id, ticker) do nothing;

insert into public.conglomerate_groups (id, owner_id, name, description, is_system) values ('00000000-0000-4000-8000-000000000016', null, 'Low Tuck Kwong / Bayan', 'Kendaraan publik utama ekosistem Bayan.', true) on conflict (id) do update set name = excluded.name, description = excluded.description, is_system = true;

insert into public.conglomerate_group_members (group_id, ticker) values
  ('00000000-0000-4000-8000-000000000016', 'BYAN')
on conflict (group_id, ticker) do nothing;

insert into public.conglomerate_groups (id, owner_id, name, description, is_system) values ('00000000-0000-4000-8000-000000000017', null, 'Haji Isam / Jhonlin', 'Kelompok Jhonlin dan saham yang sering dikaitkan dalam radar pasar.', true) on conflict (id) do update set name = excluded.name, description = excluded.description, is_system = true;

insert into public.conglomerate_group_members (group_id, ticker) values
  ('00000000-0000-4000-8000-000000000017', 'PGUN'),
  ('00000000-0000-4000-8000-000000000017', 'JARR'),
  ('00000000-0000-4000-8000-000000000017', 'TEBE'),
  ('00000000-0000-4000-8000-000000000017', 'FAST')
on conflict (group_id, ticker) do nothing;

insert into public.conglomerate_groups (id, owner_id, name, description, is_system) values ('00000000-0000-4000-8000-000000000018', null, 'Panigoro / Medco', 'Ekosistem Medco dan afiliasi investasi yang sering dipantau.', true) on conflict (id) do update set name = excluded.name, description = excluded.description, is_system = true;

insert into public.conglomerate_group_members (group_id, ticker) values
  ('00000000-0000-4000-8000-000000000018', 'MEDC'),
  ('00000000-0000-4000-8000-000000000018', 'AMMN')
on conflict (group_id, ticker) do nothing;

insert into public.conglomerate_groups (id, owner_id, name, description, is_system) values ('00000000-0000-4000-8000-000000000019', null, 'Panin / Mu''min Ali Gunawan', 'Kelompok Panin di perbankan, asuransi, dan pembiayaan.', true) on conflict (id) do update set name = excluded.name, description = excluded.description, is_system = true;

insert into public.conglomerate_group_members (group_id, ticker) values
  ('00000000-0000-4000-8000-000000000019', 'PNBN'),
  ('00000000-0000-4000-8000-000000000019', 'PNLF'),
  ('00000000-0000-4000-8000-000000000019', 'PNIN'),
  ('00000000-0000-4000-8000-000000000019', 'PNBS')
on conflict (group_id, ticker) do nothing;

insert into public.conglomerate_groups (id, owner_id, name, description, is_system) values ('00000000-0000-4000-8000-000000000020', null, 'Emtek / Sariaatmadja', 'Ekosistem Emtek lintas media, teknologi, digital, dan kesehatan.', true) on conflict (id) do update set name = excluded.name, description = excluded.description, is_system = true;

insert into public.conglomerate_group_members (group_id, ticker) values
  ('00000000-0000-4000-8000-000000000020', 'EMTK'),
  ('00000000-0000-4000-8000-000000000020', 'SCMA'),
  ('00000000-0000-4000-8000-000000000020', 'BUKA'),
  ('00000000-0000-4000-8000-000000000020', 'RSGK')
on conflict (group_id, ticker) do nothing;

insert into public.conglomerate_groups (id, owner_id, name, description, is_system) values ('00000000-0000-4000-8000-000000000021', null, 'Ciputra Group', 'Kendaraan publik utama Ciputra Group.', true) on conflict (id) do update set name = excluded.name, description = excluded.description, is_system = true;

insert into public.conglomerate_group_members (group_id, ticker) values
  ('00000000-0000-4000-8000-000000000021', 'CTRA')
on conflict (group_id, ticker) do nothing;

insert into public.conglomerate_groups (id, owner_id, name, description, is_system) values ('00000000-0000-4000-8000-000000000022', null, 'Pakuwon / Alexander Tedja', 'Kendaraan publik utama Pakuwon.', true) on conflict (id) do update set name = excluded.name, description = excluded.description, is_system = true;

insert into public.conglomerate_group_members (group_id, ticker) values
  ('00000000-0000-4000-8000-000000000022', 'PWON')
on conflict (group_id, ticker) do nothing;

insert into public.conglomerate_groups (id, owner_id, name, description, is_system) values ('00000000-0000-4000-8000-000000000023', null, 'Summarecon / Nagaria', 'Kendaraan publik utama Summarecon.', true) on conflict (id) do update set name = excluded.name, description = excluded.description, is_system = true;

insert into public.conglomerate_group_members (group_id, ticker) values
  ('00000000-0000-4000-8000-000000000023', 'SMRA')
on conflict (group_id, ticker) do nothing;

insert into public.conglomerate_groups (id, owner_id, name, description, is_system) values ('00000000-0000-4000-8000-000000000024', null, 'Djoko Susanto / Alfamart', 'Kelompok Alfamart dan MIDI dalam ekosistem ritel.', true) on conflict (id) do update set name = excluded.name, description = excluded.description, is_system = true;

insert into public.conglomerate_group_members (group_id, ticker) values
  ('00000000-0000-4000-8000-000000000024', 'AMRT'),
  ('00000000-0000-4000-8000-000000000024', 'MIDI')
on conflict (group_id, ticker) do nothing;

insert into public.conglomerate_groups (id, owner_id, name, description, is_system) values ('00000000-0000-4000-8000-000000000025', null, 'Astra / Jardine Matheson', 'Ekosistem Astra lintas otomotif, alat berat, agribisnis, dan konstruksi.', true) on conflict (id) do update set name = excluded.name, description = excluded.description, is_system = true;

insert into public.conglomerate_group_members (group_id, ticker) values
  ('00000000-0000-4000-8000-000000000025', 'ASII'),
  ('00000000-0000-4000-8000-000000000025', 'UNTR'),
  ('00000000-0000-4000-8000-000000000025', 'AALI'),
  ('00000000-0000-4000-8000-000000000025', 'AUTO'),
  ('00000000-0000-4000-8000-000000000025', 'ASGR'),
  ('00000000-0000-4000-8000-000000000025', 'ACST')
on conflict (group_id, ticker) do nothing;

insert into public.conglomerate_groups (id, owner_id, name, description, is_system) values ('00000000-0000-4000-8000-000000000026', null, 'Rajawali / Peter Sondakh', 'Kelompok Rajawali yang sering dipantau di perkebunan dan tambang.', true) on conflict (id) do update set name = excluded.name, description = excluded.description, is_system = true;

insert into public.conglomerate_group_members (group_id, ticker) values
  ('00000000-0000-4000-8000-000000000026', 'BWPT'),
  ('00000000-0000-4000-8000-000000000026', 'ARCI')
on conflict (group_id, ticker) do nothing;

insert into public.conglomerate_groups (id, owner_id, name, description, is_system) values ('00000000-0000-4000-8000-000000000027', null, 'Wilmar / Martua Sitorus-Kuok Network', 'Kendaraan publik yang sering dikaitkan dengan jaringan Wilmar.', true) on conflict (id) do update set name = excluded.name, description = excluded.description, is_system = true;

insert into public.conglomerate_group_members (group_id, ticker) values
  ('00000000-0000-4000-8000-000000000027', 'CEKA')
on conflict (group_id, ticker) do nothing;

insert into public.conglomerate_groups (id, owner_id, name, description, is_system) values ('00000000-0000-4000-8000-000000000028', null, 'Gudang Garam / Wonowidjojo', 'Kendaraan publik utama Gudang Garam.', true) on conflict (id) do update set name = excluded.name, description = excluded.description, is_system = true;

insert into public.conglomerate_group_members (group_id, ticker) values
  ('00000000-0000-4000-8000-000000000028', 'GGRM')
on conflict (group_id, ticker) do nothing;

insert into public.conglomerate_groups (id, owner_id, name, description, is_system) values ('00000000-0000-4000-8000-000000000029', null, 'Tiara Marga Trakindo / Hamami', 'Kendaraan publik utama yang sering dipantau untuk ekosistem Trakindo.', true) on conflict (id) do update set name = excluded.name, description = excluded.description, is_system = true;

insert into public.conglomerate_group_members (group_id, ticker) values
  ('00000000-0000-4000-8000-000000000029', 'ABMM')
on conflict (group_id, ticker) do nothing;

insert into public.conglomerate_groups (id, owner_id, name, description, is_system) values ('00000000-0000-4000-8000-000000000030', null, 'Samator / Harsono Family', 'Kendaraan publik utama Samator.', true) on conflict (id) do update set name = excluded.name, description = excluded.description, is_system = true;

insert into public.conglomerate_group_members (group_id, ticker) values
  ('00000000-0000-4000-8000-000000000030', 'AGII')
on conflict (group_id, ticker) do nothing;

insert into public.conglomerate_groups (id, owner_id, name, description, is_system) values ('00000000-0000-4000-8000-000000000031', null, 'Baramulti / Suharya Family', 'Kendaraan publik utama Baramulti.', true) on conflict (id) do update set name = excluded.name, description = excluded.description, is_system = true;

insert into public.conglomerate_group_members (group_id, ticker) values
  ('00000000-0000-4000-8000-000000000031', 'BSSR')
on conflict (group_id, ticker) do nothing;

insert into public.conglomerate_groups (id, owner_id, name, description, is_system) values ('00000000-0000-4000-8000-000000000032', null, 'Indika / Sudwikatmono-Soeryadjaya Network', 'Kendaraan publik utama ekosistem Indika.', true) on conflict (id) do update set name = excluded.name, description = excluded.description, is_system = true;

insert into public.conglomerate_group_members (group_id, ticker) values
  ('00000000-0000-4000-8000-000000000032', 'INDY')
on conflict (group_id, ticker) do nothing;

insert into public.conglomerate_groups (id, owner_id, name, description, is_system) values ('00000000-0000-4000-8000-000000000033', null, 'Provident Capital Network', 'Kelompok Provident dan portofolio yang sering masuk radar pasar.', true) on conflict (id) do update set name = excluded.name, description = excluded.description, is_system = true;

insert into public.conglomerate_group_members (group_id, ticker) values
  ('00000000-0000-4000-8000-000000000033', 'PALM'),
  ('00000000-0000-4000-8000-000000000033', 'TBIG'),
  ('00000000-0000-4000-8000-000000000033', 'MDKA')
on conflict (group_id, ticker) do nothing;

insert into public.conglomerate_groups (id, owner_id, name, description, is_system) values ('00000000-0000-4000-8000-000000000034', null, 'Merdeka Ecosystem', 'Ekosistem Merdeka di tambang dan mineral baterai.', true) on conflict (id) do update set name = excluded.name, description = excluded.description, is_system = true;

insert into public.conglomerate_group_members (group_id, ticker) values
  ('00000000-0000-4000-8000-000000000034', 'MDKA'),
  ('00000000-0000-4000-8000-000000000034', 'MBMA'),
  ('00000000-0000-4000-8000-000000000034', 'EMAS')
on conflict (group_id, ticker) do nothing;

insert into public.conglomerate_groups (id, owner_id, name, description, is_system) values ('00000000-0000-4000-8000-000000000035', null, 'Saratoga-Provident Mining Ecosystem', 'Tema mining yang sering menghubungkan Saratoga, Provident, dan Merdeka.', true) on conflict (id) do update set name = excluded.name, description = excluded.description, is_system = true;

insert into public.conglomerate_group_members (group_id, ticker) values
  ('00000000-0000-4000-8000-000000000035', 'MDKA'),
  ('00000000-0000-4000-8000-000000000035', 'MBMA'),
  ('00000000-0000-4000-8000-000000000035', 'EMAS'),
  ('00000000-0000-4000-8000-000000000035', 'PALM')
on conflict (group_id, ticker) do nothing;

insert into public.conglomerate_groups (id, owner_id, name, description, is_system) values ('00000000-0000-4000-8000-000000000036', null, 'Saham Gold', 'Kelompok saham komoditas emas dan mineral terkait yang bisa dipantau sebagai satu tema.', true) on conflict (id) do update set name = excluded.name, description = excluded.description, is_system = true;

insert into public.conglomerate_group_members (group_id, ticker) values
  ('00000000-0000-4000-8000-000000000036', 'ANTM'),
  ('00000000-0000-4000-8000-000000000036', 'ARCI'),
  ('00000000-0000-4000-8000-000000000036', 'HRTA'),
  ('00000000-0000-4000-8000-000000000036', 'EMAS'),
  ('00000000-0000-4000-8000-000000000036', 'PSAB'),
  ('00000000-0000-4000-8000-000000000036', 'MDKA'),
  ('00000000-0000-4000-8000-000000000036', 'AMMN')
on conflict (group_id, ticker) do nothing;

insert into public.conglomerate_groups (id, owner_id, name, description, is_system) values ('00000000-0000-4000-8000-000000000037', null, 'Kalla Group', 'Belum ada flagship BEI yang bersih untuk dilabel sebagai kendaraan utama grup.', true) on conflict (id) do update set name = excluded.name, description = excluded.description, is_system = true;

insert into public.conglomerate_groups (id, owner_id, name, description, is_system) values ('00000000-0000-4000-8000-000000000038', null, 'CT/Para Retail-Media Ecosystem', 'Kendaraan publik utama yang bisa dipantau adalah BBHI; bisnis besar lain masih private.', true) on conflict (id) do update set name = excluded.name, description = excluded.description, is_system = true;

insert into public.conglomerate_group_members (group_id, ticker) values
  ('00000000-0000-4000-8000-000000000038', 'BBHI')
on conflict (group_id, ticker) do nothing;

insert into public.conglomerate_groups (id, owner_id, name, description, is_system) values ('00000000-0000-4000-8000-000000000039', null, 'Persada Capital / Subianto Family', 'Perlu pemetaan ulang sebelum diberi ticker core.', true) on conflict (id) do update set name = excluded.name, description = excluded.description, is_system = true;

insert into public.conglomerate_groups (id, owner_id, name, description, is_system) values ('00000000-0000-4000-8000-000000000040', null, 'Sandiaga Uno Historical Investment Network', 'SRTG dan sejumlah investasi historis; jangan disamakan dengan pengendalian saat ini.', true) on conflict (id) do update set name = excluded.name, description = excluded.description, is_system = true;

insert into public.conglomerate_group_members (group_id, ticker) values
  ('00000000-0000-4000-8000-000000000040', 'SRTG')
on conflict (group_id, ticker) do nothing;

insert into public.conglomerate_groups (id, owner_id, name, description, is_system) values ('00000000-0000-4000-8000-000000000041', null, 'Tjokrosaputro Historical Network', 'Ada hubungan historis dengan sejumlah emiten, tetapi perlu dipisahkan dari kepemilikan atau pengendalian terkini.', true) on conflict (id) do update set name = excluded.name, description = excluded.description, is_system = true;

commit;
