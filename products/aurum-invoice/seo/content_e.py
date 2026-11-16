from content_a import script, callout

REVIEWS = dict(
    slug="reviews", nav="Customer reviews",
    title="Aurum Invoice Studio Reviews: What Customers Say",
    desc="Read what business owners say about Aurum Invoice Studio, or share your own experience. Every review is read before it is shown.",
    h1="What customers say about Aurum",
    intro="Honest feedback helps other business owners decide. Read what customers say below, or add your own review. We read every review before it appears, and we never edit what you wrote.",
    sections=[
        ("Reviews and your turn to review", '<div data-reviews data-limit="30" data-form="1" data-open="1"></div>'),
        ("How reviews work here", "<ul><li>Anyone who has used Aurum can send a review.</li><li><b>Every review is read by us before it appears.</b> We remove spam and anything that looks fake or abusive, but we do not remove a review because it is critical.</li><li>A <b>Verified buyer</b> mark means we have confirmed the reviewer paid for a licence.</li><li>We never write reviews for customers or offer to pay for them.</li></ul>"),
        ("Not sure yet?", "<p>See exactly what your clients will see in the <a href=\"/app/\">free demo</a>, or read about <a href=\"/invoice-app-nigeria/\">what Aurum does</a> and <a href=\"/about/\">how buying works</a>.</p>"),
    ],
    faq=[("Can I leave a review if I have not bought Aurum?", "You can try the free demo and review that, but only buyers get the Verified buyer mark."),
         ("Why did my review not appear straight away?", "Every review is read by us first. It usually appears within a day."),
         ("Can I change or delete my review?", "Message us on WhatsApp on 0703 297 8008 and we will help.")],
    related=["invoice-app-nigeria", "about", "best-invoice-app-for-small-business-nigeria"])
