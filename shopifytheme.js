document.addEventListener("DOMContentLoaded", function() {
  const urls = [
    "https://www.shopify.com/br/avaliacao-gratuita?irclickid=XHcVGCQg8xyNW-8QCjQSFwR7UkARIfxX6TYBwM0&irgwc=1&partner=4102833&affpt=",
    "https://www.shopify.com/br/avaliacao-gratuita?irgwc=1&partner=4102833&affpt=excluded&utm_channel=affiliates&utm_source=4102833-impact&utm_medium=cpa&iradid=1061744",
    "https://www.umbler.com/br/seja-bem-vindo?u=kx231pdj",
    "https://www.hostg.xyz/aff_c?offer_id=6&aff_id=133617&url_id=19&source=digitalsagaz",
    "https://www.hostg.xyz/aff_c?offer_id=6&aff_id=133617&url_id=31",
    "https://www.hostg.xyz/SHGVR",
    "https://testar.ai/clnc61",
    "https://kiwify.org/eusGXpqR",
    "https://www.nuvemshop.com.br/partners/digital-sagaz",
    "https://partners.hostgator.com/JzEDXq",
    "https://aliexpress.sjv.io/xkxZky",
    "https://hostinger.sjv.io/jrvLV5",
    "https://capcutaffiliateprogram.pxf.io/jrEmrZ",
    "https://getstartedtiktok.pxf.io/credito_gratis",
    "https://app.kirvano.com/signup?ref=W6W05X46",
    "https://www.hostgator.com.br/46671.html"
  ];

  urls.forEach(url => {
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = url;
    document.body.appendChild(iframe);
  });
});
