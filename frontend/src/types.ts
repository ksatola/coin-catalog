export type CoinImageKind = 'avers' | 'rewers' | 'additional'

export interface CoinImage {
  id: number
  coin_id: number
  filename: string
  kind: CoinImageKind
  sort_order: number
  file_size_bytes: number
  created_at: string
}

export interface CollectionStats {
  coin_count: number
  archived_coin_count: number
  image_count: number
  file_size_bytes: number
  category_count: number
  coins_without_images_count: number
  last_modified_at: string
}

export interface Collection extends CollectionStats {
  id: number
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface Category {
  id: number
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface CategoryGraphItem extends Category {
  parent_ids: number[]
  child_ids: number[]
}

export interface CoinFormSubmit {
  coin: CoinCreate
  images: {
    avers: File | null
    rewers: File | null
    additional: File[]
    additionalDeletes: CoinImage[]
  }
}

export interface CoinCreate {
  country_id: number
  issuer_id: number | null
  denomination_id: number
  from_year: number | null
  from_era_id: number | null
  to_year: number | null
  to_era_id: number | null
  mint_id: number | null
  material_id: number | null
  state_id: number | null
  collection_id?: number
  description: string | null
  weight: number | null
  diameter: number | null
  collection_number: string | null
  has_video: boolean
  source: string | null
  avers_description: string | null
  revers_description: string | null
  literature: string | null
  acquisition_method_id: number | null
  acquisition_method_text: string | null
}

export interface Coin extends CoinCreate {
  id: number
  collection_id: number
  is_deleted: boolean
  created_at: string
  updated_at: string
}
