/**
 * 類型定義 Barrel File
 *
 * 此檔案作為統一的類型匯出入口點，維持向後相容性
 * 所有類型已分離到專門的模組中
 */

// ========== 掉落/物品資料類型 ==========
export type {
  DropItem,
  DropsEssential,
  MonsterIndexItem,
  MonsterIndex,
  ItemIndexItem,
  ItemIndex,
  DropRelations,
  ItemSource,
  ExtendedUniqueItem,
  SuggestionItem,
  FavoriteMonster,
  FavoriteItem,
  ViewHistoryItem,
  FilterMode,
  SearchTypeFilter,
  ClearModalType,
  Language,
  TranslationKey,
  Translations,
  Theme,
  MerchantDropItem,
  MerchantMapData,
} from './drops'

// ========== 轉蛋相關類型 ==========
export type {
  ItemAvailability,
  ItemRequiredStats,
  GachaItemStats,
  ItemVersion,
  GachaItem,
  GachaMachine,
  GachaSearchResult,
  RandomEquipmentStats,
  GachaResult,
} from './gacha'

// 向後相容：ItemStats 曾經是 Record<string, number | undefined>
// 現在重新命名為 GachaItemStats，但保留舊名稱的匯出
export type { GachaItemStats as ItemStats } from './gacha'

// ========== 怪物/地圖類型 ==========
export type {
  AccuracyCalculatorState,
  MonsterStats,
  MobInfo,
  MonsterSpawn,
  MapInfo,
} from './monster'

// ========== 物品裝備屬性類型 ==========
export type {
  ItemRequirements,
  ItemClasses,
  ItemEquipmentStats,
  StatVariation,
  ItemEquipment,
  ScrollStats,
  ScrollInfo,
  PotionStats,
  PotionInfo,
  ItemAttributes,
  ItemAttributesEssential,
  ItemAttributesDetailed,
  EnhancedRequirements,
  EnhancedStats,
  EnhancedStatVariation,
  EnhancedEquipment,
  EnhancedScroll,
  EnhancedGachaItem,
  ItemsOrganizedDescription,
  ItemsOrganizedMetaInfo,
  ItemsOrganizedTypeInfo,
  ItemsOrganizedRandomStat,
  ItemsOrganizedData,
} from './item-equipment'

// ========== 篩選相關類型 ==========
export type {
  FilterLogicOperator,
  DataTypeFilter,
  CategoryGroupType,
  ItemCategoryGroup,
  JobClass,
  ElementType,
  LevelRange,
  AdvancedFilterOptions,
} from './filters'

