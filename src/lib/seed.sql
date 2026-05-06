INSERT INTO sites (id, nom) VALUES (1, 'Épinal'), (2, 'Remiremont'), (3, 'Neufchâteau')
ON CONFLICT (id) DO NOTHING;

-- Centrifugeuses Épinal
INSERT INTO centrifugeuses (site_id, nom, modele, est_backup) VALUES
(1, 'MFXPRO_8540', 'MFXPRO', false),
(1, 'MFX3_6421', 'MFX3', false),
(1, 'MFX3_5213', 'MFX3', false),
(1, 'MFST_7814', 'MFST', false),
(1, 'Minispin_6789', 'Minispin', false),
(1, 'Cytospin_5316', 'Cytospin', false),
(1, 'BACK_UP_MFX3_6421', 'MFX3', true),
(1, 'BACK_UP_MFX3_5213', 'MFX3', true);

-- Centrifugeuses Remiremont
INSERT INTO centrifugeuses (site_id, nom, modele, est_backup) VALUES
(2, 'BIO_4195', 'BIO', false),
(2, 'BIO_2846', 'BIO', false),
(2, 'BIO_3098', 'BIO', false),
(2, 'BIO_5074', 'BIO', false),
(2, 'BIO_5164', 'BIO', false),
(2, 'BIO_5198', 'BIO', false);

-- Programmes MFXPRO_8540 (id=1)
INSERT INTO programmes (centrifugeuse_id, numero, libelle) VALUES
(1, 1, 'IH'),
(1, 2, 'MPA, Hémostase Spé, Ponction, Urine, LCR'),
(1, 3, 'Quantiférons'),
(1, 4, 'Urine → Antigénurie légionnelle POS'),
(1, 5, 'Don Organes et Cornées (Nancy ou Besançon)'),
(1, 6, 'ECP / Bioprotec');

-- Programmes MFX3_6421 (id=2)
INSERT INTO programmes (centrifugeuse_id, numero, libelle) VALUES
(2, 1, 'IH'),
(2, 2, 'MPA, Hémostase Spé, Ponction, Urine, LCR'),
(2, 3, 'Quantiférons'),
(2, 4, 'Urine → Antigénurie légionnelle POS'),
(2, 5, 'Don Organes et Cornées (Nancy ou Besançon)'),
(2, 6, 'ECP / Bioprotec'),
(2, 8, 'Cryo 37'),
(2, 9, 'Ammonium, ACTH, Homocystéine, Phénotypage DPD, Autres envois congelés'),
(2, 10, 'LCR +5°C → Alzheimer seul (Nancy)');

-- Programmes MFX3_5213 (id=3)
INSERT INTO programmes (centrifugeuse_id, numero, libelle) VALUES
(3, 1, 'IH'),
(3, 2, 'MPA, Hémostase Spé, Ponction, Urine, LCR'),
(3, 3, 'Quantiférons'),
(3, 4, 'Urine → Antigénurie légionnelle POS'),
(3, 5, 'Don Organes et Cornées (Nancy ou Besançon)'),
(3, 6, 'ECP / Bioprotec'),
(3, 8, 'Cryo 37'),
(3, 9, 'Ammonium, ACTH, Homocystéine, Phénotypage DPD, Autres envois congelés'),
(3, 10, 'LCR +5°C → Alzheimer seul (Nancy)'),
(3, 11, 'Post cycle 5°C → 20°C');

-- Programmes MFST_7814 (id=4)
INSERT INTO programmes (centrifugeuse_id, numero, libelle) VALUES
(4, 1, 'IH'),
(4, 2, 'MPA, Hémostase Spé, Ponction, Urine, LCR'),
(4, 4, 'Cryo 37'),
(4, 5, 'Ammonium, ACTH, Homocystéine, Phénotypage DPD, Autres envois congelés');

-- Programmes Minispin_6789 (id=5)
INSERT INTO programmes (centrifugeuse_id, numero, libelle) VALUES
(5, 1, '5,4 rpm');

-- Programmes Cytospin_5316 (id=6)
INSERT INTO programmes (centrifugeuse_id, numero, libelle) VALUES
(6, 1, 'Liquides autres'),
(6, 2, 'LCR');

-- Programmes BACK_UP_MFX3_6421 (id=7)
INSERT INTO programmes (centrifugeuse_id, numero, libelle) VALUES
(7, 1, 'IH'),
(7, 2, 'MPA, Hémostase Spé, Ponction, Urine, LCR'),
(7, 3, 'Quantiférons'),
(7, 4, 'Urine → Antigénurie légionnelle POS'),
(7, 5, 'Don Organes et Cornées (Nancy ou Besançon)'),
(7, 6, 'ECP / Bioprotec'),
(7, 8, 'Cryo 37'),
(7, 9, 'Ammonium, ACTH, Homocystéine, Phénotypage DPD, Autres envois congelés'),
(7, 10, 'LCR +5°C → Alzheimer seul (Nancy)');

-- Programmes BIO_4195 Remiremont (id=9)
INSERT INTO programmes (centrifugeuse_id, numero, libelle) VALUES
(9, 1, 'IH'),
(9, 2, 'Hémostase, ACC, Envois, Chimie Sang/Urine/LCR/Ponction'),
(9, 3, 'Quantiférons'),
(9, 4, 'Urine → Antigénurie légionnelle POS'),
(9, 5, 'Précycle chaud'),
(9, 6, 'Cryo 37'),
(9, 7, 'Post cycle 37°C → 20°C');

-- Programmes BIO_3098 Remiremont (id=11)
INSERT INTO programmes (centrifugeuse_id, numero, libelle) VALUES
(11, 1, 'IH'),
(11, 2, 'Hémostase, ACC, Envois, Chimie Sang/Urine/LCR/Ponction, Post cycle 37°C → 20°C'),
(11, 3, 'Quantiférons'),
(11, 4, 'Urine → Antigénurie légionnelle POS'),
(11, 5, 'Don Organes et Cornées (Nancy ou Besançon)'),
(11, 6, 'ECP / Bioprotec'),
(11, 7, 'Précycle chaud'),
(11, 8, 'Cryo 37'),
(11, 9, 'Précycle froid, ACTH, Homocystéine, Phénotypage DPD, Autres envois +5°C, Ammonium'),
(11, 10, 'LCR +5°C → Alzheimer seul'),
(11, 11, 'Post cycle 5°C → 20°C');
