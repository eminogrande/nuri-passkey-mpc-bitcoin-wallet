
# Collecting Privy Expo + Passkey Documentation (Expo Mobile)

## Goal

Gather **all official Privy documentation that relates to Expo mobile development _and_ passkey authentication** into a single bundle you can feed to an AI agent or share with teammates.

---

## Method 1 — Clone the Docs Repository (clean & lossless)

Privy’s docs live in a public Mintlify repo.

```bash
git clone https://github.com/Privy/mintlify-docs.git
cd mintlify-docs
```

The Expo‑specific pages are under **`docs/guide/expo/`**.

```bash
mkdir ../privy-expo-passkey
rsync -av --prune-empty-dirs       --include='*/'       --include='guide/expo/**'       --exclude='*'       docs/ ../privy-expo-passkey

cd ../privy-expo-passkey
zip -r ../privy-expo-passkey.zip .
```

To build static HTML instead of MDX/Markdown:

```bash
npm i -g mintlify
cd ../mintlify-docs
mintlify build --open=false   # writes to /build
zip -r ../privy-expo-passkey-html.zip build
```

*Pros*: canonical source, Markdown front‑matter preserved  
*Cons*: requires Git

---

## Method 2 — Mirror the Live Site with `wget`

If Git is not available:

```bash
wget --mirror      --convert-links      --adjust-extension      --page-requisites      --no-parent      --restrict-file-names=windows      --domains docs.privy.io      --include-directories=/guide/expo,/guide/expo/setup,/guide/expo/authentication      https://docs.privy.io/guide/expo/
```

Package it:

```bash
zip -r privy-expo-passkey-site.zip docs.privy.io
```

Convert HTML to Markdown (optional):

```bash
find docs.privy.io -name '*.html' -exec       pandoc -f html -t markdown "{}" -o "{}.md" \;
```

---

## Method 3 — Render One‑Shot PDFs

Quick, human‑readable bundle:

```bash
urls=(
  https://docs.privy.io/guide/expo
  https://docs.privy.io/guide/expo/setup/passkey
  https://docs.privy.io/guide/expo/authentication/passkey
  https://docs.privy.io/guide/expo/quickstart
)

for u in "${urls[@]}"; do
  fname="$(basename "$u").pdf"
  wkhtmltopdf "$u" "$fname"
done

zip privy-expo-passkey-pdfs.zip *.pdf
```

---

## Feeding the Bundle to an AI Agent

1. **Split by headings** (`##`) for smaller chunks.  
2. **Embed & index** with your vector store (e.g. FAISS, Pinecone).  
3. **Automate updates**: re‑run the scripts on a cron, then diff or re‑embed only changed pages.

---

## Key Entry Points

| Topic | Link |
|-------|------|
| Expo SDK overview | <https://docs.privy.io/guide/expo> |
| Passkey setup guide | <https://docs.privy.io/guide/expo/setup/passkey> |
| Passkey auth hook reference | <https://docs.privy.io/guide/expo/authentication/passkey> |
| Quick‑start | <https://docs.privy.io/guide/expo/quickstart> |
| Expo starter repo | <https://github.com/privy-io/expo-starter> |

---

*Happy bundling & RAG‑ing!*
