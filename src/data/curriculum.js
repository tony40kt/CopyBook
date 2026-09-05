const makeLetters = (start, end, prefix, hintBuilder) =>
  Array.from({ length: end - start + 1 }, (_, i) => {
    const code = start + i;
    const ch = String.fromCharCode(code);
    return {
      id: `${prefix}-${ch}`,
      char: ch,
      hint: hintBuilder(ch),
      type: "char",
    };
  });

const makeWordItems = (prefix, words) =>
  words.map((w, i) => ({
    id: `${prefix}-${i + 1}`,
    char: w,
    hint: `Trace word "${w}"`,
    type: "word",
  }));

const makeZhItems = (prefix, chars) =>
  chars.map((ch, i) => ({
    id: `${prefix}-${i + 1}`,
    char: ch,
    hint: `練習「${ch}」`,
    type: "char",
  }));

const englishUpper = makeLetters(65, 90, "en-upper", (ch) => `Trace uppercase "${ch}"`);
const englishLower = makeLetters(97, 122, "en-lower", (ch) => `Trace lowercase "${ch}"`);

// 50 words: 2-4 letters
const englishWordsBeginner = makeWordItems("en-wb", [
  "on", "up", "go", "egg", "ant", "bee", "car", "bus", "hat", "cup","pen", "sun", "sky", "sea", "ice", "key", "map", "cat", "dog", "pig","fox", "cow", "toy", "boy", "girl", "man", "run", "sit", "fly", "book","ball", "milk", "fish", "bird", "star", "moon", "tree", "leaf", "ship", "frog","duck", "lion", "goat", "ring", "sock", "lamp", "desk", "door", "cake", "rice","nood", "soup", "sand", "wind", "rain", "snow", "hill", "road", "park", "farm","seed", "corn", "bear", "wolf", "shoe", "coat", "play", "jump", "lion", "baby","home", "king", "gold", "fish", "frog", "duck", "boat", "bike", "kite", "gift","bell", "hand", "foot", "hair", "nose", "face", "milk", "soup", "cake", "rice","meat", "pear", "corn", "rose", "pink", "blue", "swim", "walk", "jump", "read"
]);

// 50 words: 4-6 letters
const englishWordsIntermediate = makeWordItems("en-wi", [
  "apple", "beach", "bread", "chair", "clock", "cloud", "dance", "dream", "earth", "field","glass", "grape", "happy", "heart", "horse", "house", "juice", "light", "lunch", "music","night", "nurse", "ocean", "paper", "party", "phone", "plant", "plate", "queen", "radio","rainy", "right", "river", "shirt", "sleep", "smile", "smoke", "sound", "spoon", "stone","story", "sweet", "table", "train", "truck", "voice", "watch", "water", "wheel", "world","write", "youth", "zebra", "cheese", "coffee", "dinner", "flight", "guitar", "monkey", "orange","pencil", "planet", "police", "purple", "rabbit", "rocket", "school", "silver", "sister", "soccer","spring", "summer", "tennis", "travel", "turtle", "window", "winter", "yellow", "animal", "autumn","banana", "basket", "bottle", "bridge", "butter", "camera", "carrot", "cookie", "doctor", "eraser","family", "father", "flower", "forest", "friend", "garden", "golden", "lesson", "market", "mother"
]);

// 50 words: 5+ letters
const englishWordsAdvanced = makeWordItems("en-wa", [
"about", "above", "actor", "adult", "after", "again", "agree", "ahead", "alarm", "album","alive", "allow", "alone", "along", "alter", "among", "anger", "angle", "angry", "apart","apple", "apply", "arena", "argue", "arise", "armed", "array", "arrow", "aside", "asset","audio", "audit", "avoid", "award", "aware", "awful", "bacon", "badge", "baker", "baron","basic", "basis", "batch", "beach", "beard", "beast", "ballot", "banana", "banker", "basket","library", "rainbow", "adoption", "airplane", "backpack", "backyard", "birthday", "building", "calendar", "computer","daughter", "daydream", "dinosaur", "discover", "elephant", "engineer", "exercise", "favorite", "festival", "firework","football", "homework", "hospital", "internet", "keyboard", "language", "learning", "magazine", "medicine", "mountain","notebook", "painting", "question", "remember", "sandwich", "sunshine", "triangle", "umbrella", "vacation", "wireless","animal", "autumn", "bottle", "bridge", "butter", "camera", "carrot", "cookie", "doctor", "eraser"
]);

// 中文初級 50
const zhBeginner = makeZhItems("zh-b", [
  "一", "人", "力", "二", "八", "九", "入", "了", "又", "刀","丁", "七", "卜", "乃", "口", "山", "三", "十", "大", "土","子", "女", "小", "上", "下", "凡", "久", "也", "千", "工","弓", "才", "干", "夕", "川", "日", "月", "天", "手", "木","火", "水", "中", "心", "本", "王", "不", "太", "少", "六","分", "公", "父", "毛", "方", "引", "井", "內", "今", "介","元", "勿", "犬", "牛", "牙", "尺", "巴", "田", "目", "石","白", "立", "正", "古", "出", "可", "平", "半", "用", "四","生", "左", "去", "只", "叫", "外", "右", "世", "主", "以","付", "代", "令", "兄", "冬", "功", "加", "耳", "米", "早"
]);

// 中文中級 50
const zhIntermediate = makeZhItems("zh-i", [
  "他", "江", "字", "向", "老", "衣", "名", "百", "年", "因","回", "每", "羽", "尖", "你", "住", "作", "那", "車", "貝","走", "足", "弟", "兒", "兵", "妙", "孝", "豆", "角", "谷","河", "林", "花", "空", "門", "近", "朋", "明", "東", "果","兔", "狗", "定", "官", "欣", "店", "居", "拔", "事", "草","茶", "洗", "星", "室", "重", "春", "夏", "秋", "南", "美","音", "便", "信", "前", "風", "界", "客", "封", "海", "浪","們", "校", "桌", "家", "班", "乘", "借", "氣", "特", "留","破", "笑", "紙", "記", "追", "庭", "唱", "問", "清", "晚","晨", "這", "都", "部", "湖", "椅", "間", "跑", "最", "開"
]);

// 中文高級 50
const zhAdvanced = makeZhItems("zh-a", [
 "凸", "凹", "區", "開", "報", "喜", "單", "場", "最", "幾","期", "買", "雲", "畫", "遊", "過", "短", "等", "答", "集","發", "程", "絕", "給", "統", "街", "話", "試", "誠", "想","感", "新", "數", "意", "路", "農", "業", "當", "圓", "境","實", "對", "說", "語", "認", "精", "綠", "算", "種", "聞","察", "連", "遠", "歌", "麼", "領", "榮", "鬧", "練", "複","線", "調", "論", "諸", "趣", "廣", "寫", "慶", "德", "樣","課", "進", "請", "齒", "學", "燈", "樹", "親", "興", "辦","頭", "戰", "整", "橋", "選", "錢", "隨", "環", "幫", "醫","關", "願", "藥", "藝", "識", "辭", "懷", "簽", "霧", "疆"
]);

export const curriculum = {
  english: {
    key: "english",
    label: "English",
    groups: [
      {
        id: "uppercase",
        title: "Uppercase Letters (A-Z)",
        description: "26 levels",
        items: englishUpper,
        unlock: { type: "none" },
      },
      {
        id: "lowercase",
        title: "Lowercase Letters (a-z)",
        description: "26 levels",
        items: englishLower,
        unlock: { type: "none" },
      },
      {
        id: "word-beginner",
        title: "🟢 Words Beginner (2-4 letters)",
        description: "50 levels · need uppercase + lowercase all >=1⭐",
        items: englishWordsBeginner,
        unlock: { type: "requireGroupsAllOneStar", groups: ["uppercase", "lowercase"] },
      },
      {
        id: "word-intermediate",
        title: "🟡 Words Intermediate (4-6 letters)",
        description: "50 levels · need uppercase + lowercase all >=1⭐",
        items: englishWordsIntermediate,
        unlock: { type: "requireGroupsAllOneStar", groups: ["uppercase", "lowercase"] },
      },
      {
        id: "word-advanced",
        title: "🔴 Words Advanced (5+ letters)",
        description: "50 levels · need uppercase + lowercase all >=1⭐",
        items: englishWordsAdvanced,
        unlock: { type: "requireGroupsAllOneStar", groups: ["uppercase", "lowercase"] },
      },
    ],
  },

  chinese: {
    key: "chinese",
    label: "中文",
    groups: [
      {
        id: "zh-beginner",
        title: "🟢 初級 Beginner（1-5 劃）",
        description: "50 levels",
        items: zhBeginner,
        unlock: { type: "none" },
      },
      {
        id: "zh-intermediate",
        title: "🟡 中級 Intermediate（6-11 劃）",
        description: "50 levels",
        items: zhIntermediate,
        unlock: { type: "none" },
      },
      {
        id: "zh-advanced",
        title: "🔴 高級 Advanced（12+ 劃）",
        description: "50 levels",
        items: zhAdvanced,
        unlock: { type: "none" },
      },
    ],
  },
};