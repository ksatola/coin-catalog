<script lang="ts">
import MarkdownIt from 'markdown-it'
import type { Token } from 'markdown-it'
import { defineComponent, h, type VNode } from 'vue'
import StoryCoinEmbed from './StoryCoinEmbed.vue'
import StoryAssetEmbed from './StoryAssetEmbed.vue'
import type { StoryEmbeddedAsset, StoryEmbeddedCoin } from '../types'

const markdown = new MarkdownIt({
  html: false,
  breaks: false,
  linkify: false,
  typographer: false,
})

function safeHref(href: string): string {
  const value = href.trim()
  if (/^(https?:|mailto:|\/|#)/i.test(value)) return value
  return '#'
}

function renderAsset(id: number, embeddedAssets: StoryEmbeddedAsset[], key: string | number): VNode {
  const embedded = embeddedAssets.find((item) => item.id === id)
  return h(StoryAssetEmbed, { key, id, asset: embedded?.asset ?? null })
}

function renderCoin(id: number, embeddedCoins: StoryEmbeddedCoin[], key: string | number): VNode {
  const embedded = embeddedCoins.find((item) => item.id === id)
  if (!embedded) {
    return h('span', { key, class: 'story-coin-placeholder', 'data-coin-id': id }, `Moneta #${id} — ładowanie danych…`)
  }
  return h(StoryCoinEmbed, {
    key,
    id,
    coin: embedded.coin,
    deleted: embedded.deleted,
  })
}

function renderText(content: string, embeddedCoins: StoryEmbeddedCoin[], embeddedAssets: StoryEmbeddedAsset[], keyPrefix: string | number): VNode[] {
  const pattern = /\{\{\s*(coin|image):(\d+)\s*\}\}/g
  const nodes: VNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let part = 0

  while ((match = pattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(h('span', { key: `${keyPrefix}-text-${part++}` }, content.slice(lastIndex, match.index)))
    }
    const id = Number(match[2])
    nodes.push(match[1] === 'coin'
      ? renderCoin(id, embeddedCoins, `${keyPrefix}-coin-${part++}`)
      : renderAsset(id, embeddedAssets, `${keyPrefix}-image-${part++}`))
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    nodes.push(h('span', { key: `${keyPrefix}-text-${part}` }, content.slice(lastIndex)))
  }

  return nodes
}

function inlineNodes(tokens: Token[], embeddedCoins: StoryEmbeddedCoin[] = [], embeddedAssets: StoryEmbeddedAsset[] = []): VNode[] {
  return tokens.flatMap((token, index) => {
    if (token.type === 'text') {
      return renderText(token.content, embeddedCoins, embeddedAssets, index)
    }
    if (token.type === 'softbreak' || token.type === 'hardbreak') return [h('br', { key: index })]
    if (token.type === 'code_inline') return [h('code', { key: index }, token.content)]
    if (token.type === 'image') {
      return [h('img', { key: index, src: safeHref(token.attrGet('src') ?? ''), alt: token.attrGet('alt') ?? '', loading: 'lazy' })]
    }
    if (token.type === 'link_close') return []
    if (token.type === 'strong_open' || token.type === 'strong_close' || token.type === 'em_open' || token.type === 'em_close' || token.type === 's_open' || token.type === 's_close') return []
    return []
  })
}

function renderInline(token: Token, embeddedCoins: StoryEmbeddedCoin[], embeddedAssets: StoryEmbeddedAsset[]): VNode[] {
  const children = token.children ?? []
  const nodes: VNode[] = []
  let index = 0
  while (index < children.length) {
    const child = children[index]
    if (!child) break
    if (child.type === 'strong_open' || child.type === 'em_open' || child.type === 's_open') {
      const closeType = child.type.replace('_open', '_close')
      let depth = 1
      let close = index + 1
      for (; close < children.length; close += 1) {
        const candidate = children[close]
        if (!candidate) break
        if (candidate.type === child.type) depth += 1
        if (candidate.type === closeType) {
          depth -= 1
          if (depth === 0) break
        }
      }
      const tag = child.type === 'strong_open' ? 'strong' : child.type === 'em_open' ? 'em' : 's'
      nodes.push(h(tag, { key: index }, inlineNodes(children.slice(index + 1, close), embeddedCoins, embeddedAssets)))
      index = close + 1
      continue
    }
    if (child.type === 'link_open') {
      let depth = 1
      let close = index + 1
      for (; close < children.length; close += 1) {
        const candidate = children[close]
        if (!candidate) break
        if (candidate.type === 'link_open') depth += 1
        if (candidate.type === 'link_close') {
          depth -= 1
          if (depth === 0) break
        }
      }
      const href = safeHref(child.attrGet('href') ?? '')
      nodes.push(h('a', { key: index, href, target: /^https?:/i.test(href) ? '_blank' : undefined, rel: /^https?:/i.test(href) ? 'noopener noreferrer' : undefined }, inlineNodes(children.slice(index + 1, close), embeddedCoins, embeddedAssets)))
      index = close + 1
      continue
    }
    if (child.type === 'text') {
      nodes.push(...renderText(child.content, embeddedCoins, embeddedAssets, index))
      index += 1
      continue
    }
    nodes.push(...inlineNodes([child], embeddedCoins, embeddedAssets))
    index += 1
  }
  return nodes
}

function findClose(tokens: Token[], start: number, openType: string, closeType: string): number {
  let depth = 0
  for (let index = start; index < tokens.length; index += 1) {
    const token = tokens[index]
    if (!token) break
    if (token.type === openType) depth += 1
    if (token.type === closeType) {
      depth -= 1
      if (depth === 0) return index
    }
  }
  return tokens.length
}

function renderTokens(tokens: Token[], embeddedCoins: StoryEmbeddedCoin[], embeddedAssets: StoryEmbeddedAsset[], start = 0, end = tokens.length): VNode[] {
  const nodes: VNode[] = []
  let index = start
  while (index < end) {
    const token = tokens[index]
    if (!token) break
    if (token.type === 'inline') {
      nodes.push(...renderInline(token, embeddedCoins, embeddedAssets))
      index += 1
      continue
    }
    if (token.type === 'fence' || token.type === 'code_block') {
      const className = token.type === 'fence' && token.info.trim() ? `language-${token.info.trim()}` : undefined
      nodes.push(h('pre', { key: index }, [h('code', { class: className }, token.content)]))
      index += 1
      continue
    }
    if (token.type === 'hr') {
      nodes.push(h('hr', { key: index }))
      index += 1
      continue
    }
    const containers: Record<string, { tag: string; close: string }> = {
      blockquote_open: { tag: 'blockquote', close: 'blockquote_close' },
      bullet_list_open: { tag: 'ul', close: 'bullet_list_close' },
      ordered_list_open: { tag: 'ol', close: 'ordered_list_close' },
      list_item_open: { tag: 'li', close: 'list_item_close' },
      paragraph_open: { tag: 'p', close: 'paragraph_close' },
      heading_open: { tag: token.tag, close: 'heading_close' },
      table_open: { tag: 'table', close: 'table_close' },
      thead_open: { tag: 'thead', close: 'thead_close' },
      tbody_open: { tag: 'tbody', close: 'tbody_close' },
      tr_open: { tag: 'tr', close: 'tr_close' },
      th_open: { tag: 'th', close: 'th_close' },
      td_open: { tag: 'td', close: 'td_close' },
    }
    const container = containers[token.type]
    if (container) {
      const close = findClose(tokens, index, token.type, container.close)
      nodes.push(h(container.tag, { key: index }, renderTokens(tokens, embeddedCoins, embeddedAssets, index + 1, close)))
      index = close + 1
      continue
    }
    index += 1
  }
  return nodes
}

export default defineComponent({
  name: 'StoryRenderer',
  props: {
    content: { type: String, required: true },
    embeddedCoins: { type: Array as () => StoryEmbeddedCoin[], default: () => [] },
    embeddedAssets: { type: Array as () => StoryEmbeddedAsset[], default: () => [] },
  },
  setup(props) {
    return () => h('div', { class: 'story-renderer' }, renderTokens(markdown.parse(props.content, {}), props.embeddedCoins, props.embeddedAssets))
  },
})
</script>
<style scoped>
.story-renderer{line-height:1.7}.story-renderer :deep(h1),.story-renderer :deep(h2),.story-renderer :deep(h3),.story-renderer :deep(h4),.story-renderer :deep(h5),.story-renderer :deep(h6){margin:1.2em 0 .5em}.story-renderer :deep(p){margin:.8em 0}.story-renderer :deep(ul),.story-renderer :deep(ol){padding-left:1.5em}.story-renderer :deep(blockquote){margin:1em 0;padding-left:1em;border-left:3px solid #cbd5e1;color:#475569}.story-renderer :deep(pre){overflow:auto;padding:12px;background:#f8fafc;border-radius:6px}.story-renderer :deep(code){font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.story-renderer :deep(table){border-collapse:collapse;width:100%}.story-renderer :deep(th),.story-renderer :deep(td){border:1px solid #cbd5e1;padding:6px 8px;text-align:left}.story-renderer :deep(img){max-width:100%;height:auto}.story-coin-placeholder{display:inline-block;padding:4px 8px;border:1px dashed #94a3b8;border-radius:6px;background:#f8fafc;color:#334155;font-weight:600}
</style>
