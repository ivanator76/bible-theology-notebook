const BOOKS = [
  ['gen','創世記','Genesis'],['exo','出埃及記','Exodus'],['lev','利未記','Leviticus'],['num','民數記','Numbers'],['deu','申命記','Deuteronomy'],
  ['jos','約書亞記','Joshua'],['jdg','士師記','Judges'],['rut','路得記','Ruth'],['1sa','撒母耳記上','1 Samuel'],['2sa','撒母耳記下','2 Samuel'],
  ['1ki','列王紀上','1 Kings'],['2ki','列王紀下','2 Kings'],['1ch','歷代志上','1 Chronicles'],['2ch','歷代志下','2 Chronicles'],['ezr','以斯拉記','Ezra'],
  ['neh','尼希米記','Nehemiah'],['est','以斯帖記','Esther'],['job','約伯記','Job'],['psa','詩篇','Psalms'],['pro','箴言','Proverbs'],
  ['ecc','傳道書','Ecclesiastes'],['sng','雅歌','Song of Solomon'],['isa','以賽亞書','Isaiah'],['jer','耶利米書','Jeremiah'],['lam','耶利米哀歌','Lamentations'],
  ['ezk','以西結書','Ezekiel'],['dan','但以理書','Daniel'],['hos','何西阿書','Hosea'],['jol','約珥書','Joel'],['amo','阿摩司書','Amos'],
  ['oba','俄巴底亞書','Obadiah'],['jon','約拿書','Jonah'],['mic','彌迦書','Micah'],['nah','那鴻書','Nahum'],['hab','哈巴谷書','Habakkuk'],
  ['zep','西番雅書','Zephaniah'],['hag','哈該書','Haggai'],['zec','撒迦利亞書','Zechariah'],['mal','瑪拉基書','Malachi'],['mat','馬太福音','Matthew'],
  ['mrk','馬可福音','Mark'],['luk','路加福音','Luke'],['jhn','約翰福音','John'],['act','使徒行傳','Acts'],['rom','羅馬書','Romans'],
  ['1co','哥林多前書','1 Corinthians'],['2co','哥林多後書','2 Corinthians'],['gal','加拉太書','Galatians'],['eph','以弗所書','Ephesians'],['php','腓立比書','Philippians'],
  ['col','歌羅西書','Colossians'],['1th','帖撒羅尼迦前書','1 Thessalonians'],['2th','帖撒羅尼迦後書','2 Thessalonians'],['1ti','提摩太前書','1 Timothy'],['2ti','提摩太後書','2 Timothy'],
  ['tit','提多書','Titus'],['phm','腓利門書','Philemon'],['heb','希伯來書','Hebrews'],['jas','雅各書','James'],['1pe','彼得前書','1 Peter'],
  ['2pe','彼得後書','2 Peter'],['1jn','約翰一書','1 John'],['2jn','約翰二書','2 John'],['3jn','約翰三書','3 John'],['jud','猶大書','Jude'],['rev','啟示錄','Revelation'],
];

const BOOK_MAP = Object.fromEntries(BOOKS.map(([id, zh, en], order) => [id, { id, zh, en, order }]));

module.exports = { BOOKS, BOOK_MAP };
