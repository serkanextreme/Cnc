{
  "meta": {
    "project": "Talaş (CNC Hesaplayıcı) — React + Tailwind + shadcn/ui",
    "goal": "Kullanıcının ZIP içindeki FireVibe.ai statik HTML tasarımını 1:1 yeniden üretmek; aynı görsel dili bozmadan 2 yeni ekran (Özel Malzeme Formu, Ayarlar) eklemek.",
    "critical_constraints": [
      "Yeni tema/palet/font ÖNERME. Aşağıdaki tokenlar birebir kullanılacak.",
      "Dark theme only.",
      "Offline-first PWA; ağ bağımlılığı yok.",
      "React .js dosyaları (tsx değil).",
      "Tüm etkileşimli ve kritik bilgi öğelerinde data-testid zorunlu."
    ]
  },

  "design_tokens": {
    "exact_hex": {
      "background": "#111719",
      "foreground": "#F3F7F5",
      "card": "#182123",
      "card_foreground": "#F3F7F5",
      "muted": "#1D292B",
      "muted_foreground": "#B5C3C2",
      "border": "#344346",
      "input": "#202C2E",
      "primary": "#F4B942",
      "primary_foreground": "#17201F",
      "secondary": "#236B6A",
      "secondary_foreground": "#F4FAF9",
      "accent": "#55C6C3",
      "accent_foreground": "#102120",
      "destructive": "#E7685C",
      "destructive_foreground": "#FFFFFF",
      "success": "#5DBB87",
      "success_foreground": "#102218",
      "chart_1": "#F4B942",
      "chart_2": "#55C6C3",
      "chart_3": "#6FA8E8",
      "chart_4": "#5DBB87",
      "chart_5": "#D784B5",
      "radius_px": 10
    },

    "css_variables_block_hsl": {
      "where": "/app/frontend/src/index.css @layer base",
      "note": "Tailwind config HSL var kullanıyor: hsl(var(--token)). Aşağıdaki değerler HEX→HSL dönüşümüdür (yakın eşleşme). 1:1 görsel için gerekirse küçük düzeltme yapılabilir ama HEX tokenlar değişmeyecek.",
      "block": ":root {\n  --background: 195 19% 8%; /* #111719 */\n  --foreground: 150 24% 96%; /* #F3F7F5 */\n\n  --card: 191 19% 12%; /* #182123 */\n  --card-foreground: 150 24% 96%; /* #F3F7F5 */\n\n  --popover: 191 19% 12%;\n  --popover-foreground: 150 24% 96%;\n\n  --muted: 186 19% 14%; /* #1D292B */\n  --muted-foreground: 175 11% 74%; /* #B5C3C2 */\n\n  --border: 190 13% 24%; /* #344346 */\n  --input: 186 18% 15%; /* #202C2E */\n\n  --primary: 42 89% 61%; /* #F4B942 */\n  --primary-foreground: 170 18% 11%; /* #17201F */\n\n  --secondary: 179 51% 28%; /* #236B6A */\n  --secondary-foreground: 165 43% 97%; /* #F4FAF9 */\n\n  --accent: 178 51% 55%; /* #55C6C3 */\n  --accent-foreground: 176 53% 10%; /* #102120 */\n\n  --destructive: 7 74% 63%; /* #E7685C */\n  --destructive-foreground: 0 0% 100%;\n\n  --success: 145 39% 55%; /* #5DBB87 */\n  --success-foreground: 145 54% 10%; /* #102218 */\n\n  --ring: 42 89% 61%; /* primary */\n\n  --chart-1: 42 89% 61%;\n  --chart-2: 178 51% 55%;\n  --chart-3: 212 71% 67%; /* #6FA8E8 */\n  --chart-4: 145 39% 55%;\n  --chart-5: 315 47% 68%; /* #D784B5 */\n\n  --radius: 10px;\n}\n\n/* App dark-only: body veya #root'a .dark eklemek yerine root tokenları zaten dark olacak şekilde kullanın. */\n.dark {\n  /* İsterseniz aynı değerleri burada da tekrar edebilirsiniz; ama proje dark-only ise :root yeterli. */\n}\n"
    },

    "tailwind_config_additions": {
      "where": "/app/frontend/tailwind.config.js",
      "add": {
        "theme": {
          "extend": {
            "borderRadius": {
              "theme": "var(--radius)"
            },
            "fontFamily": {
              "sans": ["\"IBM Plex Sans\"", "ui-sans-serif", "system-ui"],
              "condensed": ["\"Barlow Condensed\"", "ui-sans-serif", "system-ui"]
            },
            "colors": {
              "success": "hsl(var(--success))",
              "successForeground": "hsl(var(--success-foreground))"
            }
          }
        }
      },
      "usage_notes": [
        "rounded-theme => rounded-theme (10px) her kart/alan için standart.",
        "Başlık ve sayısal sonuçlarda font-condensed kullanın.",
        "success rengi shadcn default'ta yok; bu ek ile Badge/Chip varyantlarında kullanılacak."
      ]
    },

    "typography": {
      "fonts": {
        "heading_numeric": {
          "family": "Barlow Condensed",
          "rules": [
            "TÜM başlıklar UPPERCASE",
            "font-bold",
            "tracking-tight (başlık) / tracking-[-0.01em] (büyük sayılar)",
            "Sayısal sonuçlar daima condensed + büyük"
          ]
        },
        "body": {
          "family": "IBM Plex Sans",
          "rules": [
            "Form label, açıklama, hint, liste satırları"
          ]
        }
      },
      "scale": {
        "eyebrow": "text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground",
        "screen_title": "font-condensed uppercase font-bold tracking-tight text-3xl",
        "section_title": "font-condensed uppercase font-bold tracking-tight text-xl",
        "body": "text-sm text-foreground/90",
        "muted": "text-xs text-muted-foreground",
        "big_number": "font-condensed font-bold text-4xl tracking-[-0.01em]",
        "big_number_sm": "font-condensed font-bold text-3xl tracking-[-0.01em]"
      },
      "number_format": {
        "locale": "tr-TR",
        "rules": [
          "Binlik ayırıcı: . (3.714)",
          "Ondalık: , (0,08)",
          "Input içinde kullanıcı virgül yazarsa kabul et; internal parse normalize et (UI guideline)."
        ]
      }
    },

    "layout": {
      "container": "mx-auto max-w-[393px] px-5",
      "screen_padding": "pt-4 pb-28",
      "section_spacing": "space-y-4",
      "card_spacing": "space-y-3",
      "touch_targets": "min-h-[44px]",
      "sticky_header": "sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
      "bottom_bar": "fixed bottom-0 left-0 right-0 z-40"
    },

    "iconography": {
      "library": "lucide-react",
      "sizes": {
        "tab": "h-5 w-5",
        "row": "h-4 w-4",
        "cta": "h-5 w-5"
      },
      "color_rules": [
        "Default icon: text-muted-foreground",
        "Active/primary: text-primary",
        "Destructive: text-destructive",
        "Success: text-success"
      ]
    }
  },

  "component_inventory": {
    "component_path": {
      "shadcn_ui": "/app/frontend/src/components/ui",
      "use_these": [
        "button.jsx",
        "badge.jsx",
        "card.jsx",
        "tabs.jsx",
        "toggle-group.jsx",
        "drawer.jsx",
        "sheet.jsx",
        "input.jsx",
        "label.jsx",
        "switch.jsx",
        "checkbox.jsx",
        "separator.jsx",
        "scroll-area.jsx",
        "sonner.jsx"
      ]
    },

    "reusable_components_spec": {
      "ScreenShell": {
        "purpose": "Her route için ortak mobil container + bottom bar boşluğu",
        "wrapper_class": "min-h-dvh bg-background text-foreground",
        "inner_class": "mx-auto max-w-[393px] px-5 pt-4 pb-28",
        "data_testid": "screen-shell"
      },

      "ScreenHeader": {
        "purpose": "Üstte eyebrow + büyük condensed başlık + opsiyonel sağ aksiyon",
        "class": "sticky top-0 z-30 -mx-5 px-5 pt-4 pb-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border",
        "structure": [
          "EyebrowTitle",
          "TitleRow: left title, right icon button"
        ],
        "title_class": "font-condensed uppercase font-bold tracking-tight text-3xl",
        "action_button": "h-10 w-10 rounded-theme border border-border bg-card active:scale-[0.98]",
        "data_testid": "screen-header"
      },

      "EyebrowTitle": {
        "class": "text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground",
        "data_testid": "eyebrow-title"
      },

      "ListCard": {
        "class": "rounded-theme border border-border bg-card overflow-hidden",
        "inner": "divide-y divide-border",
        "data_testid": "list-card"
      },

      "ListRow": {
        "class": "flex items-center justify-between gap-3 px-4 py-3",
        "left": "flex items-center gap-3 min-w-0",
        "right": "flex items-center gap-2",
        "title": "text-sm font-medium text-foreground truncate",
        "subtitle": "text-xs text-muted-foreground truncate",
        "chevron": "text-muted-foreground",
        "press": "active:bg-muted/60",
        "data_testid": "list-row"
      },

      "NumericField": {
        "purpose": "Label + range hint + büyük numeric input + unit suffix",
        "container": "space-y-2",
        "label_row": "flex items-end justify-between gap-3",
        "label": "text-xs font-medium text-foreground/90",
        "hint": "text-xs text-muted-foreground",
        "field": "h-12 rounded-theme border border-border bg-input px-3 flex items-center justify-between gap-3",
        "value": "font-condensed font-bold text-2xl tracking-tight text-foreground",
        "placeholder": "text-muted-foreground",
        "unit_wrap": "pl-3 border-l border-border text-xs text-muted-foreground",
        "invalid": "border-destructive/80 ring-1 ring-destructive/30",
        "disabled": "opacity-50",
        "data_testid": "numeric-field"
      },

      "SegmentedToggle": {
        "class": "grid grid-cols-2 rounded-theme border border-border bg-muted p-1",
        "item": "h-10 rounded-[8px] text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
        "data_testid": "segmented-toggle"
      },

      "Stepper": {
        "purpose": "Flute count gibi integer değerler",
        "wrap": "flex items-center justify-between h-12 rounded-theme border border-border bg-input",
        "btn": "h-12 w-12 grid place-items-center text-muted-foreground active:bg-muted/60",
        "value": "font-condensed font-bold text-2xl",
        "data_testid": "stepper"
      },

      "ResultCard": {
        "purpose": "LIVE RESULT kartı (primary border + üst strip + 2 kolon büyük sayılar)",
        "class": "rounded-theme border border-primary bg-card overflow-hidden",
        "strip": "h-1 bg-primary",
        "inner": "p-4 space-y-3",
        "grid": "grid grid-cols-2 gap-3",
        "metric_label": "text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground",
        "metric_value_primary": "font-condensed font-bold text-4xl tracking-[-0.01em] text-primary",
        "metric_value_secondary": "font-condensed font-bold text-4xl tracking-[-0.01em] text-foreground",
        "valid_glow": "shadow-[0_0_0_1px_rgba(244,185,66,0.25),0_10px_30px_rgba(0,0,0,0.35)]",
        "invalid_state": "border-destructive shadow-[0_0_0_1px_rgba(231,104,92,0.25)]",
        "data_testid": "result-card"
      },

      "StatusChip": {
        "base": "inline-flex items-center gap-1 rounded-theme px-2 py-1 text-xs font-semibold",
        "variants": {
          "success": "bg-success/15 text-success border border-success/30",
          "warning": "bg-primary/15 text-primary border border-primary/30",
          "destructive": "bg-destructive/15 text-destructive border border-destructive/30",
          "neutral": "bg-muted text-muted-foreground border border-border"
        },
        "data_testid": "status-chip"
      },

      "RangeHintChip": {
        "purpose": "Önerilen aralık/tek tık uygula",
        "class": "inline-flex items-center gap-2 rounded-theme border border-border bg-card px-3 py-2 text-xs text-foreground active:bg-muted/60",
        "pill": "rounded-theme bg-muted px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground",
        "cta": "text-primary font-semibold",
        "data_testid": "range-hint-chip"
      },

      "FormulaRow": {
        "purpose": "Formül doğrulama satırları + Doğrulandı badge",
        "row": "flex items-center justify-between gap-3 px-4 py-3",
        "left": "min-w-0",
        "name": "text-sm font-medium",
        "expr": "text-xs text-muted-foreground truncate",
        "right": "shrink-0",
        "badge": "inline-flex items-center rounded-theme bg-success/15 text-success border border-success/30 px-2 py-1 text-xs font-semibold",
        "data_testid": "formula-row"
      },

      "MaterialRow": {
        "extends": "ListRow",
        "extra": [
          "Favori yıldız butonu (lucide Star) sağda",
          "Kategori chip"
        ],
        "data_testid": "material-row"
      },

      "HistoryRow": {
        "purpose": "Geçmiş kaydı; sonuç chipleri; sil aksiyonu",
        "class": "relative",
        "content": "flex items-center justify-between gap-3 px-4 py-3",
        "chips": "flex flex-wrap gap-2",
        "delete_button": "text-destructive text-xs font-semibold",
        "swipe_optional": "İsterseniz sadece butonla silin; swipe eklenirse Drawer/AlertDialog ile onay.",
        "data_testid": "history-row"
      },

      "BottomTabBar": {
        "class": "fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border",
        "inner": "mx-auto max-w-[393px] px-5 h-20 flex items-center justify-between",
        "tab": "flex flex-col items-center justify-center gap-1 w-full h-16 rounded-theme active:bg-muted/60",
        "label": "text-[11px] font-semibold uppercase tracking-[0.14em]",
        "active": "text-primary",
        "inactive": "text-muted-foreground",
        "data_testid": "bottom-tab-bar"
      },

      "BottomActionBar": {
        "purpose": "Kaydet / Hesapla / Kullan gibi tekil CTA",
        "class": "fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-border",
        "inner": "mx-auto max-w-[393px] px-5 py-4",
        "button_primary": "w-full h-12 rounded-theme bg-primary text-primary-foreground font-semibold active:scale-[0.99]",
        "button_secondary": "w-full h-12 rounded-theme border border-border bg-card text-foreground font-semibold",
        "data_testid": "bottom-action-bar"
      },

      "ClampNotice": {
        "purpose": "Tezgâh limiti uygulandı banner",
        "class": "rounded-theme border border-primary/40 bg-primary/10 px-4 py-3",
        "title": "text-xs font-semibold text-primary",
        "body": "text-xs text-foreground/90",
        "data_testid": "clamp-notice"
      },

      "EmptyState": {
        "class": "rounded-theme border border-border bg-card p-6 text-center",
        "title": "font-condensed uppercase font-bold text-xl",
        "body": "text-sm text-muted-foreground",
        "cta": "mt-4 inline-flex h-11 items-center justify-center rounded-theme bg-primary px-4 text-primary-foreground font-semibold",
        "data_testid": "empty-state"
      },

      "PickerDrawer": {
        "purpose": "Mobil picker/arama listesi için bottom drawer",
        "use": "shadcn Drawer (vaul)",
        "drawer_content": "rounded-t-[16px] border border-border bg-card",
        "header": "px-5 pt-4 pb-3 border-b border-border",
        "body": "px-5 py-4",
        "scroll": "max-h-[70vh] overflow-auto",
        "data_testid": "picker-drawer"
      }
    }
  },

  "screens": {
    "global_rules": [
      "Her ekran: ScreenShell + ScreenHeader + içerik + (BottomTabBar veya BottomActionBar)",
      "Body padding-bottom pb-28 bottom bar çakışmasını engeller.",
      "Section başlıkları: EyebrowTitle + condensed title.",
      "Liste grupları: ListCard + ListRow divider.",
      "Tüm inputlar label ile bağlanmalı (Label htmlFor)."
    ],

    "routes": {
      "/": {
        "name": "Hesapla (Home)",
        "header": {
          "eyebrow": "TALAŞ",
          "title": "HESAPLA",
          "right_action": "Ayarlar (icon button)"
        },
        "sections_order": [
          "Aktif Malzeme Kartı (Değiştir)",
          "Operasyon Seç (Freze primary büyük kart, Torna/Matkap ikincil)",
          "Son Kullanılan (history kısa liste)"
        ],
        "bottom": "BottomTabBar (Hesapla/Malzemeler/Geçmiş)"
      },

      "/freze": {
        "name": "Freze Hesabı",
        "header": { "eyebrow": "HESAPLAMA", "title": "FREZE" },
        "sections_order": [
          "Malzeme özet satırı + değiştir",
          "Takım (Karbür/HSS segmented, Ø, ağız sayısı stepper, köşe R picker)",
          "Kesme Parametreleri (Vc, fz, ap, ae)",
          "LIVE RESULT ResultCard (n, Vf, Vc_eff, Q, kW, Nm, hm)",
          "Önerilen Aralık Chipleri (tek tık uygula)",
          "ClampNotice (varsa)",
          "Formül Doğrulama Paneli (collapsible)"
        ],
        "bottom": "BottomActionBar: Kaydet / Paylaş"
      },

      "/torna": {
        "name": "Torna Hesabı",
        "header": { "eyebrow": "HESAPLAMA", "title": "TORNA" },
        "sections_order": [
          "Malzeme özet satırı",
          "Parça (OD/ID segmented, Ø)",
          "Uç (insert tipi picker, burun rε)",
          "Kesme Parametreleri (Vc, f, ap, hedef Ra)",
          "LIVE RESULT (n, Vf, Ra_actual, önerilen f, Q, kW)",
          "Machine-limit kartı (limit uygulanırsa ClampNotice)",
          "Formül Doğrulama"
        ],
        "bottom": "BottomActionBar"
      },

      "/matkap": {
        "name": "Matkap Hesabı",
        "header": { "eyebrow": "HESAPLAMA", "title": "MATKAP" },
        "sections_order": [
          "Malzeme özet satırı",
          "Matkap (tip picker, Ø, soğutma toggle)",
          "Kesme Parametreleri (Vc, f, delik derinliği)",
          "LIVE RESULT (n, Vf, çevrim süresi sn, Q, kW)",
          "ClampNotice (varsa)",
          "Formül Doğrulama"
        ],
        "bottom": "BottomActionBar"
      },

      "/malzemeler": {
        "name": "Malzemeler",
        "header": { "eyebrow": "KÜTÜPHANE", "title": "MALZEMELER" },
        "sections_order": [
          "Search input (bg-input) + filtre drawer",
          "Kategori chip grid (9 kategori)",
          "Favoriler bölümü (varsa)",
          "Malzeme listesi (24 preload + custom)"
        ],
        "floating_action": "FAB veya ListRow: 'Yeni Malzeme Ekle' (primary) — bottom bar üstünde",
        "bottom": "BottomTabBar"
      },

      "/malzemeler/:id": {
        "name": "Malzeme Detayı",
        "header": { "eyebrow": "MALZEME", "title": "DETAY" },
        "sections_order": [
          "Özellikler kartı (sertlik, yoğunluk vb)",
          "Tabs: Freze | Torna | Matkap (shadcn Tabs)",
          "Her tab içinde önerilen Vc/fz/f aralık chipleri",
          "CTA: 'Hesaplamada Kullan' (BottomActionBar primary)"
        ]
      },

      "/malzeme/yeni": {
        "name": "Yeni Özel Malzeme (NEW)",
        "header": { "eyebrow": "ÖZEL", "title": "MALZEME EKLE" },
        "sections_order": [
          "Kimlik: Ad, kategori, not",
          "Freze önerileri: Vc aralığı, fz aralığı (Karbür/HSS ayrı alanlar gerekiyorsa segmented + alanlar)",
          "Torna önerileri: Vc aralığı, f aralığı, Ra hedef aralığı",
          "Matkap önerileri: Vc aralığı, f aralığı",
          "Tehlike/uyarı: 'Bu değerler öneridir' info satırı"
        ],
        "bottom": "BottomActionBar: Kaydet (primary) + İptal (secondary)"
      },

      "/malzeme/:id/duzenle": {
        "name": "Özel Malzeme Düzenle (NEW)",
        "same_as": "/malzeme/yeni",
        "extra": [
          "Üstte StatusChip: 'ÖZEL'",
          "Alt aksiyon: Kaydet + Sil (destructive)"
        ]
      },

      "/gecmis": {
        "name": "Geçmiş",
        "header": { "eyebrow": "KAYITLAR", "title": "GEÇMİŞ" },
        "sections_order": [
          "Bugün özeti (kaç kayıt, son hesap)",
          "Gün bazlı gruplar (tarih başlığı + ListCard)",
          "HistoryRow: yeniden aç, paylaş, sil"
        ],
        "empty": "EmptyState: 'Henüz kayıt yok' + 'Hesaplamaya Başla'"
      },

      "/ayarlar": {
        "name": "Ayarlar (NEW)",
        "header": { "eyebrow": "SİSTEM", "title": "AYARLAR" },
        "sections_order": [
          "Birim Sistemi: SegmentedToggle (Metrik / İnç-SFM)",
          "Tezgâh Limitleri: Checkbox 'Manuel limitleri kullan'",
          "Manuel alanlar (disabled/enabled): Max RPM, Max Feed, Güç (kW)",
          "Verim: spindle efficiency slider (0.6–1.0) + NumericField",
          "Veri: JSON dışa aktar / içe aktar (Drawer içinde textarea + butonlar)",
          "Temizlik: Geçmişi temizle (destructive + AlertDialog)"
        ],
        "disabled_state_rules": [
          "Checkbox OFF iken manuel limit NumericField: disabled + opacity-50 + pointer-events-none + hint 'Otomatik preset kullanılıyor'",
          "Checkbox ON iken alanlar aktif; invalid girilirse NumericField invalid state"
        ]
      }
    }
  },

  "motion_microinteractions": {
    "principles": [
      "Hover'a güvenme; press/active state şart.",
      "transition: all YOK. Sadece color/opacity/shadow için.",
      "Reduced motion destekle (prefers-reduced-motion)."
    ],
    "framer_motion": {
      "result_recompute": {
        "pattern": "Değer değişince sayıların opacity 0.6→1 ve y:2→0 kısa animasyonu; roll efekti yoksa fade/slide yeterli.",
        "duration_ms": 160
      },
      "tab_indicator": {
        "pattern": "Tabs altında 2px primary bar; layoutId ile yumuşak geçiş",
        "duration_ms": 180
      }
    },
    "press_states": {
      "buttons": "active:scale-[0.99] active:brightness-[0.98]",
      "rows": "active:bg-muted/60",
      "chips": "active:scale-[0.99]"
    },
    "toasts": {
      "library": "sonner",
      "use_cases": [
        "Kaydedildi",
        "Panoya kopyalandı",
        "JSON içe aktarıldı",
        "Silindi"
      ],
      "data_testid": "toast"
    }
  },

  "numeric_readout_rules": {
    "semantics": {
      "primary_result": "text-primary (amber)",
      "secondary_result": "text-foreground veya text-accent (teal) sadece türetilmiş/ikincil metriklerde",
      "invalid": "text-destructive + ResultCard invalid border",
      "within_range": "StatusChip success"
    },
    "sizes": {
      "main": "font-condensed font-bold text-4xl",
      "secondary": "font-condensed font-bold text-3xl",
      "inline": "font-condensed font-bold text-2xl"
    },
    "units": {
      "style": "text-xs text-muted-foreground border-l border-border pl-3",
      "rule": "Birim her zaman ayrı blok; sayı ile karışmasın."
    }
  },

  "states": {
    "empty": {
      "history": "EmptyState",
      "materials_search": "EmptyState: 'Sonuç bulunamadı' + 'Filtreleri temizle'"
    },
    "error_invalid": {
      "numeric_field": "border-destructive/80 ring-1 ring-destructive/30 + altına text-xs destructive mesaj",
      "result_card": "invalid_state"
    },
    "disabled": {
      "rule": "Disabled alanlar: opacity-50 + pointer-events-none; label yanında StatusChip neutral 'KAPALI'",
      "machine_limit": "Ayarlar ekranında checkbox OFF iken manuel limit alanları disabled"
    },
    "clamped": {
      "rule": "ClampNotice göster; ilgili sonuç chipinde warning; mümkünse hangi limit uygulandı yaz.",
      "copy": "Tezgâh limiti uygulandı — devir 12.000 dev/dk'ya sınırlandı"
    }
  },

  "accessibility_testing": {
    "a11y": [
      "Her input için Label + aria-describedby (hint/error).",
      "SegmentedToggle/Tabs: aria-label ve keyboard focus ring görünür olmalı (ring: primary).",
      "Kontrast: foreground vs background yüksek; muted metin sadece ikincil bilgi."
    ],
    "data_testid_rules": {
      "convention": "kebab-case, rol odaklı",
      "examples": [
        "data-testid=\"bottom-tab-calculate\"",
        "data-testid=\"material-search-input\"",
        "data-testid=\"milling-vc-numeric-field\"",
        "data-testid=\"result-card-spindle-speed\"",
        "data-testid=\"settings-unit-system-toggle\"",
        "data-testid=\"history-row-delete-button\""
      ]
    }
  },

  "image_urls": {
    "note": "Bu uygulama mockup'ında fotoğraf/illustration yok; offline-first. Görsel gerekmez. Sadece ikonlar lucide-react.",
    "items": []
  },

  "instructions_to_main_agent": [
    "index.css içindeki :root ve .dark tokenlarını bu guideline'daki HSL blok ile değiştir; App.css'teki CRA demo stillerini kaldır veya kullanma.",
    "Tailwind config'e rounded-theme ve fontFamily (condensed/sans) ekle.",
    "Uygulama dark-only: body/#root'a className=\"dark\" zorunlu değil; ama shadcn bileşenleri dark class bekliyorsa App root'a 'dark' ekleyin ve tokenları .dark içine taşıyın (tek yaklaşım seçin).",
    "Her route için ScreenShell + ScreenHeader + bottom bar pattern'ını uygula; max-w-[393px], px-5, pb-28 sabit.",
    "Picker'lar için Drawer kullan (malzeme seçimi, kategori, insert tipi vb).",
    "Tüm buton/input/toggle/tab/list-row gibi etkileşimli öğelere data-testid ekle.",
    "transition-all kullanma; sadece transition-colors/opacity/shadow.",
    "Sayısal sonuçlar: Barlow Condensed + büyük; primary sonuçlar amber (text-primary)."
  ],

  "general_ui_ux_design_guidelines_appendix": "<General UI UX Design Guidelines>\n    - You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms\n    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text\n   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json\n\n **GRADIENT RESTRICTION RULE**\nNEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc\nNEVER use dark gradients for logo, testimonial, footer etc\nNEVER let gradients cover more than 20% of the viewport.\nNEVER apply gradients to text-heavy content or reading areas.\nNEVER use gradients on small UI elements (<100px width).\nNEVER stack multiple gradient layers in the same viewport.\n\n**ENFORCEMENT RULE:**\n    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors\n\n**How and where to use:**\n   • Section backgrounds (not content backgrounds)\n   • Hero section header content. Eg: dark to light to dark color\n   • Decorative overlays and accent elements only\n   • Hero section with 2-3 mild color\n   • Gradients creation can be done for any angle say horizontal, vertical or diagonal\n\n- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**\n\n</Font Guidelines>\n\n- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. \n   \n- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.\n\n- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.\n   \n- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly\n    Eg: - if it implies playful/energetic, choose a colorful scheme\n           - if it implies monochrome/minimal, choose a black–white/neutral scheme\n\n**Component Reuse:**\n\t- Prioritize using pre-existing components from src/components/ui when applicable\n\t- Create new components that match the style and conventions of existing components when needed\n\t- Examine existing components to understand the project's component patterns before creating new ones\n\n**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component\n\n**Best Practices:**\n\t- Use Shadcn/UI as the primary component library for consistency and accessibility\n\t- Import path: ./components/[component-name]\n\n**Export Conventions:**\n\t- Components MUST use named exports (export const ComponentName = ...)\n\t- Pages MUST use default exports (export default function PageName() {...})\n\n**Toasts:**\n  - Use `sonner` for toasts\"\n  - Sonner component are located in `/app/src/components/ui/sonner.tsx`\n\nUse 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals.\n</General UI UX Design Guidelines>"
}
