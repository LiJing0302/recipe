/**
 * 食材目录 —— 全站统一食材数据源
 *
 * 维护一套常见食材列表，供以下业务域共用：
 *  - 食谱创建 / 编辑：食材添加（自动补全分类、默认单位）
 *  - 菜单 → 加入菜篮子：待采购食材（统一名称与单位）
 *  - 菜篮子 → 采购：确认采购（分类、单位、数量）
 *  - 食材库：批次维护（名称归一化、分类、单位）
 *
 * 数据来源：综合常见家庭食材资料（蔬菜/肉类/水产/水果/蛋奶/
 * 豆制品/菌菇/主食/干货/调味品等分类），每项含默认单位。
 */

/** 食材目录条目 */
export interface IngredientCatalogItem {
  /** 标准名称（用于展示与存储） */
  name: string
  /** 所属分类 */
  category: IngredientCategory
  /** 默认计量单位（采购/库存常用） */
  unit: string
  /** 常见别名（用于名称归一化匹配） */
  aliases?: string[]
  /** 是否常见（常见食材优先展示在搜索/选择列表） */
  common?: boolean
}

/** 食材分类 */
export type IngredientCategory =
  | '蔬菜'
  | '菌菇'
  | '肉类'
  | '水产'
  | '蛋奶'
  | '豆制品'
  | '水果'
  | '主食'
  | '干货'
  | '调味品'
  | '其他'

/** 分类展示顺序 */
export const INGREDIENT_CATEGORIES: IngredientCategory[] = [
  '蔬菜',
  '菌菇',
  '肉类',
  '水产',
  '蛋奶',
  '豆制品',
  '水果',
  '主食',
  '干货',
  '调味品',
  '其他'
]

/** 食材目录数据 */
export const INGREDIENT_CATALOG: IngredientCatalogItem[] = [
  /* ---------- 蔬菜 ---------- */
  { name: '大白菜', category: '蔬菜', unit: '颗', aliases: ['白菜'], common: true },
  { name: '小白菜', category: '蔬菜', unit: '把', aliases: ['青菜'], common: true },
  { name: '菠菜', category: '蔬菜', unit: '把', common: true },
  { name: '油菜', category: '蔬菜', unit: '把', aliases: ['上海青'], common: true },
  { name: '生菜', category: '蔬菜', unit: '颗', common: true },
  { name: '空心菜', category: '蔬菜', unit: '把', common: true },
  { name: '芹菜', category: '蔬菜', unit: '把', common: true },
  { name: '韭菜', category: '蔬菜', unit: '把', common: true },
  { name: '卷心菜', category: '蔬菜', unit: '颗', aliases: ['包菜', '圆白菜', '甘蓝'], common: true },
  { name: '西兰花', category: '蔬菜', unit: '颗', aliases: ['西蓝花', '青花菜'], common: true },
  { name: '花菜', category: '蔬菜', unit: '颗', aliases: ['菜花', '花椰菜'] },
  { name: '番茄', category: '蔬菜', unit: '个', aliases: ['西红柿'], common: true },
  { name: '黄瓜', category: '蔬菜', unit: '根', common: true },
  { name: '茄子', category: '蔬菜', unit: '根', common: true },
  { name: '青椒', category: '蔬菜', unit: '个', aliases: ['柿子椒', '甜椒'], common: true },
  { name: '彩椒', category: '蔬菜', unit: '个' },
  { name: '小米椒', category: '蔬菜', unit: '个', aliases: ['尖椒'], common: true },
  { name: '白萝卜', category: '蔬菜', unit: '根', common: true },
  { name: '胡萝卜', category: '蔬菜', unit: '根', common: true },
  { name: '土豆', category: '蔬菜', unit: '个', aliases: ['马铃薯', '洋芋'], common: true },
  { name: '红薯', category: '蔬菜', unit: '个', aliases: ['地瓜', '番薯'], common: true },
  { name: '紫薯', category: '蔬菜', unit: '个' },
  { name: '山药', category: '蔬菜', unit: '根', common: true },
  { name: '芋头', category: '蔬菜', unit: '个' },
  { name: '洋葱', category: '蔬菜', unit: '个', common: true },
  { name: '大蒜', category: '蔬菜', unit: '头', aliases: ['蒜头', '大蒜头'], common: true },
  { name: '大葱', category: '蔬菜', unit: '根', common: true },
  { name: '小葱', category: '蔬菜', unit: '把', aliases: ['香葱', '葱花'], common: true },
  { name: '生姜', category: '蔬菜', unit: '块', aliases: ['姜'], common: true },
  { name: '南瓜', category: '蔬菜', unit: '个', common: true },
  { name: '冬瓜', category: '蔬菜', unit: '块', common: true },
  { name: '丝瓜', category: '蔬菜', unit: '根', common: true },
  { name: '苦瓜', category: '蔬菜', unit: '根', common: true },
  { name: '西葫芦', category: '蔬菜', unit: '根', aliases: ['角瓜'], common: true },
  { name: '莲藕', category: '蔬菜', unit: '节', common: true },
  { name: '莴笋', category: '蔬菜', unit: '根', aliases: ['莴苣'] },
  { name: '芦笋', category: '蔬菜', unit: '把' },
  { name: '豆角', category: '蔬菜', unit: '把', aliases: ['四季豆', '豇豆'], common: true },
  { name: '荷兰豆', category: '蔬菜', unit: '把' },
  { name: '豌豆', category: '蔬菜', unit: '份' },
  { name: '毛豆', category: '蔬菜', unit: '份', common: true },
  { name: '玉米', category: '蔬菜', unit: '根', aliases: ['玉米棒'], common: true },
  { name: '黄豆芽', category: '蔬菜', unit: '份', aliases: ['豆芽'], common: true },
  { name: '绿豆芽', category: '蔬菜', unit: '份' },
  { name: '蒜苗', category: '蔬菜', unit: '把', aliases: ['青蒜'] },
  { name: '蒜苔', category: '蔬菜', unit: '把', aliases: ['蒜薹'] },
  { name: '香菜', category: '蔬菜', unit: '把', aliases: ['芫荽'], common: true },
  { name: '茼蒿', category: '蔬菜', unit: '把' },
  { name: '油麦菜', category: '蔬菜', unit: '把' },
  { name: '娃娃菜', category: '蔬菜', unit: '颗' },

  /* ---------- 菌菇 ---------- */
  { name: '香菇', category: '菌菇', unit: '朵', common: true },
  { name: '平菇', category: '菌菇', unit: '份', common: true },
  { name: '金针菇', category: '菌菇', unit: '把', common: true },
  { name: '杏鲍菇', category: '菌菇', unit: '根', common: true },
  { name: '口蘑', category: '菌菇', unit: '份', aliases: ['白蘑菇'] },
  { name: '蟹味菇', category: '菌菇', unit: '盒' },
  { name: '茶树菇', category: '菌菇', unit: '份' },
  { name: '海鲜菇', category: '菌菇', unit: '盒' },
  { name: '蘑菇', category: '菌菇', unit: '份' },
  { name: '草菇', category: '菌菇', unit: '份' },
  { name: '松茸', category: '菌菇', unit: '个' },

  /* ---------- 肉类 ---------- */
  { name: '五花肉', category: '肉类', unit: '份', common: true },
  { name: '猪里脊', category: '肉类', unit: '份', aliases: ['里脊肉'], common: true },
  { name: '猪排骨', category: '肉类', unit: '份', aliases: ['排骨', '小排'], common: true },
  { name: '猪肉末', category: '肉类', unit: '份', aliases: ['肉末', '肉馅', '绞肉'], common: true },
  { name: '猪前腿肉', category: '肉类', unit: '份', aliases: ['前腿肉'] },
  { name: '猪后腿肉', category: '肉类', unit: '份', aliases: ['后腿肉'] },
  { name: '猪蹄', category: '肉类', unit: '只', aliases: ['猪手', '猪脚'] },
  { name: '猪肝', category: '肉类', unit: '份', common: true },
  { name: '猪肚', category: '肉类', unit: '个' },
  { name: '肥肠', category: '肉类', unit: '份', aliases: ['猪大肠'] },
  { name: '牛肉', category: '肉类', unit: '份', common: true },
  { name: '牛腩', category: '肉类', unit: '份', common: true },
  { name: '牛里脊', category: '肉类', unit: '份' },
  { name: '牛腱子', category: '肉类', unit: '份', aliases: ['牛腱'] },
  { name: '肥牛卷', category: '肉类', unit: '份', aliases: ['肥牛', '牛肉卷'], common: true },
  { name: '羊肉', category: '肉类', unit: '份', common: true },
  { name: '羊排', category: '肉类', unit: '份' },
  { name: '羊肉卷', category: '肉类', unit: '份' },
  { name: '鸡胸肉', category: '肉类', unit: '份', aliases: ['鸡胸'], common: true },
  { name: '鸡腿', category: '肉类', unit: '个', common: true },
  { name: '鸡翅', category: '肉类', unit: '个', aliases: ['鸡翅中'], common: true },
  { name: '鸡翅根', category: '肉类', unit: '个' },
  { name: '整鸡', category: '肉类', unit: '只', aliases: ['三黄鸡', '土鸡'], common: true },
  { name: '鸭肉', category: '肉类', unit: '份', common: true },
  { name: '鸭腿', category: '肉类', unit: '个' },
  { name: '鹅肉', category: '肉类', unit: '份' },
  { name: '腊肉', category: '肉类', unit: '块', common: true },
  { name: '腊肠', category: '肉类', unit: '根', aliases: ['香肠'], common: true },
  { name: '火腿', category: '肉类', unit: '块', common: true },
  { name: '培根', category: '肉类', unit: '份' },
  { name: '午餐肉', category: '肉类', unit: '罐' },
  { name: '肉丸', category: '肉类', unit: '份', aliases: ['肉丸子'] },

  /* ---------- 水产 ---------- */
  { name: '草鱼', category: '水产', unit: '条', common: true },
  { name: '鲫鱼', category: '水产', unit: '条', common: true },
  { name: '鲤鱼', category: '水产', unit: '条' },
  { name: '鲈鱼', category: '水产', unit: '条', common: true },
  { name: '鲢鱼', category: '水产', unit: '条' },
  { name: '带鱼', category: '水产', unit: '条', common: true },
  { name: '黄花鱼', category: '水产', unit: '条' },
  { name: '鲳鱼', category: '水产', unit: '条' },
  { name: '鳕鱼', category: '水产', unit: '份', common: true },
  { name: '三文鱼', category: '水产', unit: '份', common: true },
  { name: '龙利鱼', category: '水产', unit: '份' },
  { name: '黑鱼', category: '水产', unit: '条' },
  { name: '鳜鱼', category: '水产', unit: '条' },
  { name: '罗非鱼', category: '水产', unit: '条' },
  { name: '黄鳝', category: '水产', unit: '条', aliases: ['鳝鱼'] },
  { name: '泥鳅', category: '水产', unit: '份' },
  { name: '虾', category: '水产', unit: '份', aliases: ['鲜虾', '基围虾', '河虾'], common: true },
  { name: '对虾', category: '水产', unit: '份' },
  { name: '大虾', category: '水产', unit: '只', aliases: ['明虾'], common: true },
  { name: '小龙虾', category: '水产', unit: '份' },
  { name: '虾仁', category: '水产', unit: '份', common: true },
  { name: '螃蟹', category: '水产', unit: '只', aliases: ['大闸蟹', '河蟹'], common: true },
  { name: '梭子蟹', category: '水产', unit: '只' },
  { name: '蛤蜊', category: '水产', unit: '份', aliases: ['花蛤', '文蛤'], common: true },
  { name: '扇贝', category: '水产', unit: '个', common: true },
  { name: '生蚝', category: '水产', unit: '个', aliases: ['牡蛎'] },
  { name: '鱿鱼', category: '水产', unit: '份', common: true },
  { name: '章鱼', category: '水产', unit: '份' },
  { name: '墨鱼', category: '水产', unit: '份', aliases: ['乌贼'] },
  { name: '海带', category: '水产', unit: '份', common: true },
  { name: '紫菜', category: '水产', unit: '份', common: true },
  { name: '海参', category: '水产', unit: '个' },
  { name: '鲍鱼', category: '水产', unit: '个' },
  { name: '田螺', category: '水产', unit: '份' },
  { name: '甲鱼', category: '水产', unit: '只' },

  /* ---------- 蛋奶 ---------- */
  { name: '鸡蛋', category: '蛋奶', unit: '个', common: true },
  { name: '鸭蛋', category: '蛋奶', unit: '个' },
  { name: '咸鸭蛋', category: '蛋奶', unit: '个', aliases: ['咸蛋'], common: true },
  { name: '皮蛋', category: '蛋奶', unit: '个', common: true },
  { name: '鹌鹑蛋', category: '蛋奶', unit: '个' },
  { name: '牛奶', category: '蛋奶', unit: '盒', common: true },
  { name: '酸奶', category: '蛋奶', unit: '盒', common: true },
  { name: '奶酪', category: '蛋奶', unit: '块', aliases: ['芝士', '乳酪'], common: true },
  { name: '黄油', category: '蛋奶', unit: '块', common: true },
  { name: '奶油', category: '蛋奶', unit: '盒', aliases: ['淡奶油'] },
  { name: '奶粉', category: '蛋奶', unit: '罐' },

  /* ---------- 豆制品 ---------- */
  { name: '豆腐', category: '豆制品', unit: '块', common: true },
  { name: '嫩豆腐', category: '豆制品', unit: '盒', aliases: ['内酯豆腐'], common: true },
  { name: '老豆腐', category: '豆制品', unit: '块', aliases: ['北豆腐'] },
  { name: '豆腐干', category: '豆制品', unit: '块', aliases: ['豆干'], common: true },
  { name: '豆腐皮', category: '豆制品', unit: '张', aliases: ['千张', '百叶'], common: true },
  { name: '腐竹', category: '豆制品', unit: '份', common: true },
  { name: '豆泡', category: '豆制品', unit: '份', aliases: ['油豆腐'], common: true },
  { name: '豆浆', category: '豆制品', unit: '杯', common: true },
  { name: '豆腐脑', category: '豆制品', unit: '份' },
  { name: '臭豆腐', category: '豆制品', unit: '份' },
  { name: '素鸡', category: '豆制品', unit: '根' },
  { name: '黄豆', category: '豆制品', unit: '份', common: true },
  { name: '绿豆', category: '豆制品', unit: '份', common: true },
  { name: '红豆', category: '豆制品', unit: '份', aliases: ['赤小豆'], common: true },
  { name: '黑豆', category: '豆制品', unit: '份' },
  { name: '鹰嘴豆', category: '豆制品', unit: '份' },

  /* ---------- 水果 ---------- */
  { name: '苹果', category: '水果', unit: '个', common: true },
  { name: '香蕉', category: '水果', unit: '根', common: true },
  { name: '橙子', category: '水果', unit: '个', aliases: ['甜橙'], common: true },
  { name: '橘子', category: '水果', unit: '个', aliases: ['桔子', '柑橘'], common: true },
  { name: '柚子', category: '水果', unit: '个', common: true },
  { name: '柠檬', category: '水果', unit: '个', common: true },
  { name: '梨', category: '水果', unit: '个', aliases: ['雪梨', '鸭梨'], common: true },
  { name: '桃子', category: '水果', unit: '个', common: true },
  { name: '葡萄', category: '水果', unit: '串', common: true },
  { name: '西瓜', category: '水果', unit: '个', common: true },
  { name: '哈密瓜', category: '水果', unit: '个' },
  { name: '草莓', category: '水果', unit: '盒', common: true },
  { name: '蓝莓', category: '水果', unit: '盒', common: true },
  { name: '猕猴桃', category: '水果', unit: '个', aliases: ['奇异果'], common: true },
  { name: '芒果', category: '水果', unit: '个', common: true },
  { name: '菠萝', category: '水果', unit: '个', aliases: ['凤梨'], common: true },
  { name: '火龙果', category: '水果', unit: '个' },
  { name: '牛油果', category: '水果', unit: '个', aliases: ['鳄梨'], common: true },
  { name: '樱桃', category: '水果', unit: '份', aliases: ['车厘子'] },
  { name: '荔枝', category: '水果', unit: '份' },
  { name: '龙眼', category: '水果', unit: '份', aliases: ['桂圆'] },
  { name: '石榴', category: '水果', unit: '个' },
  { name: '柿子', category: '水果', unit: '个' },
  { name: '枣', category: '水果', unit: '份', aliases: ['红枣', '大枣'], common: true },
  { name: '山楂', category: '水果', unit: '份' },
  { name: '百香果', category: '水果', unit: '个' },
  { name: '椰子', category: '水果', unit: '个' },
  { name: '杨梅', category: '水果', unit: '份' },

  /* ---------- 主食 ---------- */
  { name: '大米', category: '主食', unit: '份', aliases: ['米饭'], common: true },
  { name: '小米', category: '主食', unit: '份', common: true },
  { name: '糯米', category: '主食', unit: '份' },
  { name: '黑米', category: '主食', unit: '份' },
  { name: '糙米', category: '主食', unit: '份' },
  { name: '面粉', category: '主食', unit: '份', aliases: ['小麦粉'], common: true },
  { name: '挂面', category: '主食', unit: '份', aliases: ['面条', '面条'], common: true },
  { name: '意面', category: '主食', unit: '份', aliases: ['意大利面'] },
  { name: '方便面', category: '主食', unit: '袋', aliases: ['泡面'], common: true },
  { name: '粉丝', category: '主食', unit: '份', aliases: ['粉条'], common: true },
  { name: '年糕', category: '主食', unit: '份', common: true },
  { name: '燕麦', category: '主食', unit: '份', aliases: ['麦片'], common: true },
  { name: '饺子皮', category: '主食', unit: '份' },
  { name: '馄饨皮', category: '主食', unit: '份' },
  { name: '馒头', category: '主食', unit: '个', common: true },
  { name: '面包', category: '主食', unit: '份', common: true },
  { name: '吐司', category: '主食', unit: '份', aliases: ['面包片'] },
  { name: '红薯粉', category: '主食', unit: '份' },
  { name: '凉皮', category: '主食', unit: '份' },
  { name: '米粉', category: '主食', unit: '份', aliases: ['米线'] },

  /* ---------- 干货 ---------- */
  { name: '木耳', category: '干货', unit: '份', aliases: ['黑木耳', '干木耳'], common: true },
  { name: '银耳', category: '干货', unit: '份', aliases: ['白木耳'], common: true },
  { name: '干香菇', category: '干货', unit: '份', aliases: ['冬菇'], common: true },
  { name: '黄花菜', category: '干货', unit: '份', aliases: ['金针菜'] },
  { name: '海米', category: '干货', unit: '份', aliases: ['虾米', '虾皮'], common: true },
  { name: '干贝', category: '干货', unit: '份', aliases: ['瑶柱'] },
  { name: '鱿鱼干', category: '干货', unit: '份' },
  { name: '笋干', category: '干货', unit: '份' },
  { name: '枸杞', category: '干货', unit: '份', aliases: ['枸杞子'], common: true },
  { name: '红枣干', category: '干货', unit: '份' },
  { name: '花生米', category: '干货', unit: '份', aliases: ['花生'], common: true },
  { name: '核桃', category: '干货', unit: '份', aliases: ['核桃仁'], common: true },
  { name: '芝麻', category: '干货', unit: '份', aliases: ['白芝麻', '黑芝麻'], common: true },
  { name: '杏仁', category: '干货', unit: '份' },
  { name: '腰果', category: '干货', unit: '份' },
  { name: '板栗', category: '干货', unit: '份', aliases: ['栗子'] },
  { name: '莲子', category: '干货', unit: '份' },
  { name: '葡萄干', category: '干货', unit: '份' },
  { name: '紫菜干', category: '干货', unit: '份' },

  /* ---------- 调味品 ---------- */
  { name: '盐', category: '调味品', unit: '瓶', aliases: ['食盐'], common: true },
  { name: '白糖', category: '调味品', unit: '份', aliases: ['砂糖', '白砂糖'], common: true },
  { name: '冰糖', category: '调味品', unit: '份', common: true },
  { name: '生抽', category: '调味品', unit: '瓶', aliases: ['酱油'], common: true },
  { name: '老抽', category: '调味品', unit: '瓶', common: true },
  { name: '陈醋', category: '调味品', unit: '瓶', aliases: ['香醋', '醋'], common: true },
  { name: '料酒', category: '调味品', unit: '瓶', aliases: ['黄酒'], common: true },
  { name: '蚝油', category: '调味品', unit: '瓶', common: true },
  { name: '食用油', category: '调味品', unit: '桶', aliases: ['花生油', '菜籽油', '玉米油', '葵花籽油'], common: true },
  { name: '香油', category: '调味品', unit: '瓶', aliases: ['芝麻油'], common: true },
  { name: '橄榄油', category: '调味品', unit: '瓶', common: true },
  { name: '番茄酱', category: '调味品', unit: '瓶', common: true },
  { name: '豆瓣酱', category: '调味品', unit: '瓶', common: true },
  { name: '黄豆酱', category: '调味品', unit: '瓶', aliases: ['大酱'] },
  { name: '甜面酱', category: '调味品', unit: '瓶' },
  { name: '辣椒酱', category: '调味品', unit: '瓶', aliases: ['老干妈', '辣酱'], common: true },
  { name: '孜然', category: '调味品', unit: '份', aliases: ['孜然粉'], common: true },
  { name: '花椒', category: '调味品', unit: '份', common: true },
  { name: '八角', category: '调味品', unit: '份', aliases: ['大料', '八角茴香'], common: true },
  { name: '桂皮', category: '调味品', unit: '份' },
  { name: '香叶', category: '调味品', unit: '份', aliases: ['月桂叶'] },
  { name: '白胡椒粉', category: '调味品', unit: '份', common: true },
  { name: '黑胡椒粉', category: '调味品', unit: '份', aliases: ['黑胡椒'], common: true },
  { name: '辣椒粉', category: '调味品', unit: '份', aliases: ['辣椒面'] },
  { name: '干辣椒', category: '调味品', unit: '份', common: true },
  { name: '淀粉', category: '调味品', unit: '份', aliases: ['生粉', '玉米淀粉'], common: true },
  { name: '鸡精', category: '调味品', unit: '份', aliases: ['味精'], common: true },
  { name: '蜂蜜', category: '调味品', unit: '瓶', common: true },
  { name: '腐乳', category: '调味品', unit: '瓶', aliases: ['豆腐乳', '红腐乳'] },
  { name: '豆豉', category: '调味品', unit: '份' },
  { name: '芝麻酱', category: '调味品', unit: '瓶', aliases: ['麻酱'], common: true },
  { name: '花生酱', category: '调味品', unit: '瓶' },
  { name: '沙拉酱', category: '调味品', unit: '瓶' },
  { name: '咖喱块', category: '调味品', unit: '盒', aliases: ['咖喱'] },
  { name: '芥末', category: '调味品', unit: '瓶' },
  { name: '酵母', category: '调味品', unit: '袋' },
  { name: '五香粉', category: '调味品', unit: '份' },
  { name: '十三香', category: '调味品', unit: '份' }
]

/** 归一化名称：去除空格与常见后缀，便于匹配 */
const normalizeName = (name: string) => name.trim().replace(/\s+/g, '').toLowerCase()

/** 名称 → 目录条目索引 */
const nameIndex = new Map<string, IngredientCatalogItem>()
for (const item of INGREDIENT_CATALOG) {
  nameIndex.set(normalizeName(item.name), item)
  item.aliases?.forEach((alias) => nameIndex.set(normalizeName(alias), item))
}

/** 默认计量单位（新食材未在目录中时使用） */
export const DEFAULT_UNIT = '份'

/** 默认单位列表（选择器用） */
export const INGREDIENT_UNITS = ['g', 'kg', '份', '个', '根', '把', '袋', '瓶', '块', '包', '只', '颗', '头', '盒', '罐', '桶', '杯', '张', '条', '串', '节', '朵']

/** 按名称精确查找食材（含别名匹配），未命中返回 undefined */
export const findIngredient = (name: string): IngredientCatalogItem | undefined => nameIndex.get(normalizeName(name))

/** 关键词模糊搜索食材，返回匹配项（常见优先） */
export const searchIngredients = (keyword: string, limit = 20): IngredientCatalogItem[] => {
  const key = normalizeName(keyword)
  if (!key) return []
  const matched = INGREDIENT_CATALOG.filter((item) => {
    if (normalizeName(item.name).includes(key)) return true
    return item.aliases?.some((alias) => normalizeName(alias).includes(key)) || false
  })
  return matched.sort((a, b) => Number(Boolean(b.common)) - Number(Boolean(a.common))).slice(0, limit)
}

/** 按分类获取食材列表（常见优先） */
export const getIngredientsByCategory = (category: IngredientCategory): IngredientCatalogItem[] =>
  INGREDIENT_CATALOG.filter((item) => item.category === category).sort((a, b) => Number(Boolean(b.common)) - Number(Boolean(a.common)))

/** 获取某个名称食材的分类，未命中返回 '其他' */
export const getIngredientCategory = (name: string): IngredientCategory => findIngredient(name)?.category || '其他'

/** 获取某个名称食材的默认单位，未命中返回 DEFAULT_UNIT */
export const getIngredientUnit = (name: string): string => findIngredient(name)?.unit || DEFAULT_UNIT

/** 获取全部常见食材（用于快速选择面板） */
export const getCommonIngredients = (): IngredientCatalogItem[] => INGREDIENT_CATALOG.filter((item) => item.common)
