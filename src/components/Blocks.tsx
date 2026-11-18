import { useState } from 'react'
import type { Block } from '../domain/content'
import { publicAsset } from '../config'

function ContentImage({ block }: { block: Extract<Block, { type: 'image' }> }) {
  const [failed, setFailed] = useState(false)
  return <figure>{failed ? <p className="notice" role="alert">Image could not load. Description: {block.alt}</p> : <img src={publicAsset(block.src)} alt={block.alt} width={block.width} height={block.height} onError={() => setFailed(true)} loading="lazy"/>}{block.caption && <figcaption>{block.caption}</figcaption>}</figure>
}
export function Blocks({ blocks }: { blocks: Block[] }) {
  return <div className="rich-content" lang="id">{blocks.map((block, i) => block.type === 'paragraph' ? <p key={i}>{block.text}</p> : block.type === 'image' ? <ContentImage key={block.src} block={block}/> : <div className="table-scroll" key={i} tabIndex={0} role="region" aria-label={`Table: ${block.caption}`}><table><caption>{block.caption}</caption><thead><tr>{block.headers.map((header, j) => <th key={j} scope="col">{header}</th>)}</tr></thead><tbody>{block.rows.map((row, j) => <tr key={j}>{row.map((cell, k) => <td key={k}>{cell}</td>)}</tr>)}</tbody></table></div>)}</div>
}
