DELETE FROM app_configs WHERE key IN (
  'brand_name',
  'brand_logo_url',
  'brand_footer_tagline',
  'brand_footer_download_text',
  'brand_footer_links',
  'brand_footer_socials',
  'brand_footer_copyright'
);
