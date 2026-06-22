#!/usr/bin/env python3
"""Generate modular knowledge chunk JSON files from public-domain sources."""

from __future__ import annotations

import json
import re
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW_WSC = ROOT / "knowledge" / "raw" / "wsc-wikisource.txt"
OUT_DIR = ROOT / "knowledge" / "chunks"
BIBLE_API = "https://raw.githubusercontent.com/wldeh/bible-api/master/bibles/en-web/books"

BOOK_SLUGS = {
    "Genesis": "genesis",
    "Exodus": "exodus",
    "Leviticus": "leviticus",
    "Numbers": "numbers",
    "Deuteronomy": "deuteronomy",
    "Joshua": "joshua",
    "Judges": "judges",
    "Ruth": "ruth",
    "1 Samuel": "1samuel",
    "2 Samuel": "2samuel",
    "1 Kings": "1kings",
    "2 Kings": "2kings",
    "1 Chronicles": "1chronicles",
    "2 Chronicles": "2chronicles",
    "Ezra": "ezra",
    "Nehemiah": "nehemiah",
    "Esther": "esther",
    "Job": "job",
    "Psalm": "psalms",
    "Psalms": "psalms",
    "Proverbs": "proverbs",
    "Ecclesiastes": "ecclesiastes",
    "Song of Solomon": "songofsolomon",
    "Isaiah": "isaiah",
    "Jeremiah": "jeremiah",
    "Lamentations": "lamentations",
    "Ezekiel": "ezekiel",
    "Daniel": "daniel",
    "Hosea": "hosea",
    "Joel": "joel",
    "Amos": "amos",
    "Obadiah": "obadiah",
    "Jonah": "jonah",
    "Micah": "micah",
    "Nahum": "nahum",
    "Habakkuk": "habakkuk",
    "Zephaniah": "zephaniah",
    "Haggai": "haggai",
    "Zechariah": "zechariah",
    "Malachi": "malachi",
    "Matthew": "matthew",
    "Mark": "mark",
    "Luke": "luke",
    "John": "john",
    "Acts": "acts",
    "Romans": "romans",
    "1 Corinthians": "1corinthians",
    "2 Corinthians": "2corinthians",
    "Galatians": "galatians",
    "Ephesians": "ephesians",
    "Philippians": "philippians",
    "Colossians": "colossians",
    "1 Thessalonians": "1thessalonians",
    "2 Thessalonians": "2thessalonians",
    "1 Timothy": "1timothy",
    "2 Timothy": "2timothy",
    "Titus": "titus",
    "Philemon": "philemon",
    "Hebrews": "hebrews",
    "James": "james",
    "1 Peter": "1peter",
    "2 Peter": "2peter",
    "1 John": "1john",
    "2 John": "2john",
    "3 John": "3john",
    "Jude": "jude",
    "Revelation": "revelation",
}

STOP_WORDS = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
    "by", "from", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
    "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "shall",
    "can", "that", "this", "these", "those", "it", "its", "he", "she", "they", "them", "his",
    "her", "their", "our", "your", "my", "not", "all", "who", "whom", "which", "what", "when",
    "where", "why", "how", "into", "upon", "unto", "there", "then", "than", "also", "even",
    "very", "shall", "said", "says", "come", "came", "one", "any", "every", "each", "such",
}

# book, chapter, verse_start, verse_end, topics
WEB_PASSAGES = [
    ("Genesis", 1, 1, 1, ["creation", "god", "old testament"]),
    ("Genesis", 1, 26, 27, ["creation", "image of god", "humanity"]),
    ("Genesis", 3, 15, 15, ["fall", "messiah", "promise"]),
    ("Genesis", 12, 1, 3, ["abraham", "covenant", "faith"]),
    ("Genesis", 50, 20, 20, ["providence", "joseph", "suffering"]),
    ("Exodus", 3, 14, 14, ["god", "name", "moses"]),
    ("Exodus", 20, 1, 17, ["ten commandments", "law", "ethics"]),
    ("Exodus", 34, 6, 7, ["god", "attributes", "mercy"]),
    ("Leviticus", 19, 18, 18, ["love", "neighbor", "law"]),
    ("Numbers", 6, 24, 26, ["blessing", "priestly blessing", "peace"]),
    ("Deuteronomy", 6, 4, 5, ["shema", "god", "love", "monotheism"]),
    ("Deuteronomy", 8, 3, 3, ["scripture", "word of god", "dependence"]),
    ("Deuteronomy", 31, 6, 6, ["courage", "god", "presence"]),
    ("Joshua", 1, 9, 9, ["courage", "god", "promised land"]),
    ("Joshua", 24, 15, 15, ["choice", "worship", "faithfulness"]),
    ("Ruth", 1, 16, 16, ["loyalty", "faith", "covenant"]),
    ("1 Samuel", 16, 7, 7, ["god", "heart", "character"]),
    ("Psalm", 1, 1, 6, ["wisdom", "righteousness", "scripture"]),
    ("Psalm", 19, 7, 11, ["scripture", "law", "god"]),
    ("Psalm", 23, 1, 6, ["shepherd", "comfort", "god"]),
    ("Psalm", 27, 1, 1, ["fear", "trust", "god"]),
    ("Psalm", 46, 1, 1, ["refuge", "strength", "trouble"]),
    ("Psalm", 51, 10, 12, ["repentance", "forgiveness", "heart"]),
    ("Psalm", 91, 1, 2, ["protection", "trust", "god"]),
    ("Psalm", 103, 1, 5, ["praise", "forgiveness", "mercy"]),
    ("Psalm", 119, 11, 11, ["scripture", "memory", "sin"]),
    ("Psalm", 119, 105, 105, ["scripture", "guidance", "word"]),
    ("Psalm", 121, 1, 2, ["help", "trust", "god"]),
    ("Psalm", 139, 13, 14, ["life", "creation", "human dignity"]),
    ("Psalm", 145, 8, 9, ["god", "mercy", "compassion"]),
    ("Proverbs", 3, 5, 6, ["trust", "wisdom", "guidance"]),
    ("Proverbs", 22, 6, 6, ["parenting", "training", "children"]),
    ("Ecclesiastes", 3, 1, 1, ["time", "seasons", "providence"]),
    ("Ecclesiastes", 12, 13, 13, ["fear of god", "duty", "wisdom"]),
    ("Isaiah", 7, 14, 14, ["messiah", "virgin birth", "prophecy"]),
    ("Isaiah", 9, 6, 6, ["messiah", "christ", "prophecy"]),
    ("Isaiah", 40, 8, 8, ["scripture", "word of god", "endurance"]),
    ("Isaiah", 40, 31, 31, ["strength", "hope", "waiting"]),
    ("Isaiah", 41, 10, 10, ["fear", "comfort", "god"]),
    ("Isaiah", 43, 25, 25, ["forgiveness", "sin", "god"]),
    ("Isaiah", 53, 5, 6, ["messiah", "atonement", "suffering"]),
    ("Isaiah", 55, 6, 7, ["repentance", "mercy", "seeking god"]),
    ("Isaiah", 61, 1, 1, ["messiah", "gospel", "anointing"]),
    ("Jeremiah", 29, 11, 11, ["hope", "plans", "god"]),
    ("Jeremiah", 31, 33, 33, ["covenant", "new covenant", "law"]),
    ("Lamentations", 3, 22, 23, ["mercy", "faithfulness", "hope"]),
    ("Ezekiel", 36, 26, 26, ["new heart", "holy spirit", "regeneration"]),
    ("Daniel", 6, 10, 10, ["prayer", "discipline", "faithfulness"]),
    ("Hosea", 6, 6, 6, ["mercy", "sacrifice", "knowledge of god"]),
    ("Joel", 2, 28, 28, ["holy spirit", "prophecy", "promise"]),
    ("Micah", 6, 8, 8, ["justice", "mercy", "humility"]),
    ("Malachi", 3, 6, 6, ["god", "unchangeable", "covenant"]),
    ("Matthew", 1, 23, 23, ["jesus", "immanuel", "prophecy"]),
    ("Matthew", 4, 4, 4, ["scripture", "temptation", "word of god"]),
    ("Matthew", 5, 3, 12, ["beatitudes", "kingdom", "jesus"]),
    ("Matthew", 5, 14, 16, ["witness", "light", "christian living"]),
    ("Matthew", 6, 9, 13, ["lords prayer", "prayer", "jesus"]),
    ("Matthew", 6, 33, 33, ["kingdom", "priorities", "trust"]),
    ("Matthew", 7, 7, 8, ["prayer", "seeking", "asking"]),
    ("Matthew", 11, 28, 30, ["rest", "jesus", "burden"]),
    ("Matthew", 16, 16, 19, ["peter", "church", "christ"]),
    ("Matthew", 22, 37, 40, ["greatest commandment", "love", "law"]),
    ("Matthew", 28, 19, 20, ["great commission", "church", "trinity"]),
    ("Mark", 10, 45, 45, ["jesus", "servant", "ransom"]),
    ("Mark", 12, 30, 31, ["love", "commandment", "god"]),
    ("Luke", 1, 37, 37, ["faith", "god", "impossible"]),
    ("Luke", 2, 10, 11, ["christmas", "gospel", "joy"]),
    ("Luke", 4, 18, 19, ["messiah", "gospel", "jesus"]),
    ("Luke", 15, 11, 24, ["prodigal son", "repentance", "grace"]),
    ("Luke", 19, 10, 10, ["salvation", "jesus", "seeking"]),
    ("Luke", 23, 34, 34, ["forgiveness", "cross", "jesus"]),
    ("Luke", 24, 6, 7, ["resurrection", "gospel", "jesus"]),
    ("John", 1, 1, 5, ["logos", "deity of christ", "creation"]),
    ("John", 1, 12, 13, ["salvation", "children of god", "faith"]),
    ("John", 1, 14, 14, ["incarnation", "grace", "jesus"]),
    ("John", 3, 3, 8, ["new birth", "holy spirit", "salvation"]),
    ("John", 3, 16, 17, ["salvation", "gospel", "love"]),
    ("John", 3, 36, 36, ["faith", "judgment", "eternal life"]),
    ("John", 4, 24, 24, ["worship", "spirit", "truth"]),
    ("John", 6, 35, 35, ["jesus", "bread of life", "faith"]),
    ("John", 8, 12, 12, ["jesus", "light", "life"]),
    ("John", 10, 10, 11, ["jesus", "good shepherd", "life"]),
    ("John", 10, 27, 30, ["shepherd", "eternal life", "deity"]),
    ("John", 11, 25, 26, ["resurrection", "jesus", "life"]),
    ("John", 14, 6, 6, ["jesus", "way", "truth", "salvation"]),
    ("John", 14, 16, 17, ["holy spirit", "comforter", "promise"]),
    ("John", 15, 5, 5, ["abiding", "fruit", "jesus"]),
    ("John", 16, 33, 33, ["peace", "tribulation", "victory"]),
    ("John", 17, 3, 3, ["eternal life", "knowing god", "jesus"]),
    ("John", 20, 31, 31, ["faith", "scripture", "gospel"]),
    ("Acts", 1, 8, 8, ["holy spirit", "witness", "mission"]),
    ("Acts", 2, 38, 39, ["repentance", "baptism", "holy spirit"]),
    ("Acts", 4, 12, 12, ["salvation", "jesus", "exclusivity"]),
    ("Acts", 17, 30, 31, ["repentance", "judgment", "resurrection"]),
    ("Romans", 1, 16, 17, ["gospel", "power", "righteousness"]),
    ("Romans", 3, 10, 12, ["sin", "righteousness", "gospel"]),
    ("Romans", 3, 23, 23, ["sin", "salvation", "gospel"]),
    ("Romans", 5, 8, 8, ["love", "cross", "grace"]),
    ("Romans", 6, 23, 23, ["sin", "salvation", "eternal life"]),
    ("Romans", 8, 1, 1, ["condemnation", "spirit", "salvation"]),
    ("Romans", 8, 28, 28, ["providence", "god", "purpose"]),
    ("Romans", 8, 38, 39, ["love", "security", "christ"]),
    ("Romans", 10, 9, 10, ["salvation", "faith", "confession"]),
    ("Romans", 12, 1, 2, ["worship", "transformation", "mind"]),
    ("Romans", 12, 2, 2, ["renewal", "will of god", "mind"]),
    ("1 Corinthians", 10, 13, 13, ["temptation", "faithfulness", "god"]),
    ("1 Corinthians", 13, 4, 7, ["love", "christian living", "ethics"]),
    ("1 Corinthians", 15, 3, 4, ["gospel", "resurrection", "core doctrine"]),
    ("1 Corinthians", 15, 55, 57, ["resurrection", "victory", "death"]),
    ("2 Corinthians", 5, 17, 21, ["new creation", "reconciliation", "atonement"]),
    ("Galatians", 2, 20, 20, ["faith", "crucified with christ", "life"]),
    ("Galatians", 3, 26, 28, ["faith", "baptism", "unity"]),
    ("Galatians", 5, 22, 23, ["holy spirit", "fruit", "christian living"]),
    ("Ephesians", 1, 7, 7, ["redemption", "forgiveness", "grace"]),
    ("Ephesians", 2, 8, 10, ["grace", "faith", "salvation", "works"]),
    ("Ephesians", 4, 4, 6, ["unity", "church", "one body"]),
    ("Ephesians", 6, 10, 11, ["spiritual warfare", "armor of god", "strength"]),
    ("Philippians", 2, 5, 11, ["humility", "christ", "incarnation"]),
    ("Philippians", 4, 6, 7, ["prayer", "anxiety", "peace"]),
    ("Philippians", 4, 13, 13, ["strength", "christ", "contentment"]),
    ("Colossians", 1, 15, 20, ["christ", "preeminence", "reconciliation"]),
    ("Colossians", 3, 1, 4, ["resurrection", "heavenly minded", "christ"]),
    ("1 Thessalonians", 4, 16, 17, ["second coming", "resurrection", "hope"]),
    ("1 Thessalonians", 5, 16, 18, ["joy", "prayer", "thanksgiving"]),
    ("2 Timothy", 1, 7, 7, ["holy spirit", "fear", "power"]),
    ("2 Timothy", 3, 16, 17, ["scripture", "bible", "teaching"]),
    ("Titus", 3, 5, 7, ["regeneration", "holy spirit", "salvation"]),
    ("Hebrews", 4, 12, 12, ["scripture", "word of god", "living"]),
    ("Hebrews", 9, 27, 28, ["judgment", "death", "christ"]),
    ("Hebrews", 10, 24, 25, ["church", "fellowship", "encouragement"]),
    ("Hebrews", 11, 1, 1, ["faith", "hope", "doctrine"]),
    ("Hebrews", 11, 6, 6, ["faith", "god", "reward"]),
    ("Hebrews", 12, 1, 2, ["perseverance", "jesus", "faith"]),
    ("Hebrews", 13, 8, 8, ["jesus", "unchangeable", "faithfulness"]),
    ("James", 1, 5, 5, ["wisdom", "prayer", "god"]),
    ("James", 2, 17, 18, ["faith", "works", "justification"]),
    ("James", 4, 7, 8, ["resist devil", "repentance", "holiness"]),
    ("1 Peter", 2, 9, 9, ["church", "priesthood", "identity"]),
    ("1 Peter", 3, 15, 15, ["apologetics", "hope", "witness"]),
    ("1 Peter", 5, 7, 7, ["anxiety", "care", "god"]),
    ("2 Peter", 1, 20, 21, ["scripture", "inspiration", "prophecy"]),
    ("1 John", 1, 9, 9, ["confession", "forgiveness", "sin"]),
    ("1 John", 3, 16, 16, ["love", "sacrifice", "christ"]),
    ("1 John", 4, 8, 10, ["love", "god", "atonement"]),
    ("1 John", 5, 11, 13, ["eternal life", "assurance", "faith"]),
    ("Jude", 1, 24, 25, ["doxology", "preservation", "god"]),
    ("Revelation", 1, 8, 8, ["god", "alpha omega", "eternity"]),
    ("Revelation", 3, 20, 20, ["invitation", "fellowship", "christ"]),
    ("Revelation", 21, 4, 4, ["heaven", "comfort", "new creation"]),
    ("Revelation", 22, 18, 19, ["scripture", "revelation", "authority"]),
]

CREEDS_AND_THEOLOGY = [
    {
        "id": "apostles-creed-full",
        "sourceId": "apostles",
        "reference": "Apostles' Creed",
        "topics": ["creed", "trinity", "jesus", "church", "doctrine"],
        "keywords": ["father", "almighty", "creator", "jesus", "christ", "holy spirit", "church", "forgiveness", "resurrection"],
        "text": "I believe in God, the Father almighty, creator of heaven and earth. I believe in Jesus Christ, his only Son, our Lord, who was conceived by the Holy Spirit, born of the Virgin Mary, suffered under Pontius Pilate, was crucified, died, and was buried; he descended to the dead. On the third day he rose again; he ascended into heaven, he is seated at the right hand of the Father, and he will come to judge the living and the dead. I believe in the Holy Spirit, the holy catholic Church, the communion of saints, the forgiveness of sins, the resurrection of the body, and the life everlasting.",
    },
    {
        "id": "nicene-creed-core",
        "sourceId": "nicene",
        "reference": "Nicene Creed (381 AD)",
        "topics": ["trinity", "jesus", "holy spirit", "creed", "doctrine"],
        "keywords": ["one god", "father", "son", "holy spirit", "incarnate", "crucified", "resurrection", "ascended"],
        "text": "We believe in one God, the Father, the Almighty, maker of heaven and earth. We believe in one Lord, Jesus Christ, the only Son of God, eternally begotten of the Father, God from God, Light from Light, true God from true God, begotten, not made, of one Being with the Father; through him all things were made. For us and for our salvation he came down from heaven, was incarnate of the Holy Spirit and the Virgin Mary and became truly human. For our sake he was crucified under Pontius Pilate; he suffered death and was buried. On the third day he rose again in accordance with the Scriptures; he ascended into heaven and is seated at the right hand of the Father. We believe in the Holy Spirit, the Lord, the giver of life, who proceeds from the Father and the Son, who with the Father and the Son is worshiped and glorified.",
    },
    {
        "id": "overview-ot",
        "sourceId": "web",
        "reference": "Old Testament Overview",
        "topics": ["old testament", "bible overview", "canon"],
        "keywords": ["old testament", "law", "prophets", "writings", "torah", "covenant", "israel"],
        "text": "The Old Testament records God's creation, the fall, the covenant with Israel, the Law (Torah), the Prophets, and the Writings. It points forward to the Messiah, reveals God's holiness and mercy, and forms the foundation for understanding the New Testament.",
    },
    {
        "id": "overview-nt",
        "sourceId": "web",
        "reference": "New Testament Overview",
        "topics": ["new testament", "bible overview", "gospel", "church"],
        "keywords": ["new testament", "gospels", "acts", "epistles", "revelation", "jesus", "church"],
        "text": "The New Testament contains the four Gospels (Matthew, Mark, Luke, John), Acts of the Apostles, epistles to churches and individuals, and Revelation. It centers on the life, death, and resurrection of Jesus Christ and the birth and mission of the church.",
    },
    {
        "id": "overview-gospels",
        "sourceId": "web",
        "reference": "The Four Gospels Overview",
        "topics": ["gospels", "jesus", "bible overview"],
        "keywords": ["matthew", "mark", "luke", "john", "gospel", "jesus", "kingdom", "disciples"],
        "text": "Matthew presents Jesus as the promised Jewish Messiah and King. Mark emphasizes Jesus as the suffering Servant and Son of God. Luke highlights Jesus as Savior for all peoples with careful historical detail. John proclaims Jesus as the eternal Word made flesh, the Son of God, calling readers to believe and have life in his name.",
    },
    {
        "id": "overview-paul",
        "sourceId": "web",
        "reference": "Paul's Epistles Overview",
        "topics": ["paul", "epistles", "doctrine", "church"],
        "keywords": ["paul", "romans", "corinthians", "galatians", "ephesians", "grace", "faith", "church"],
        "text": "Paul's letters explain the gospel of grace, justification by faith, union with Christ, life in the Spirit, and order in the church. Romans sets forth righteousness from God; Corinthians addresses church life and love; Galatians defends freedom in Christ; Ephesians unfolds God's eternal purpose in Christ and the unity of the church.",
    },
    {
        "id": "theology-incarnation",
        "sourceId": "nicene",
        "reference": "Christian Theology — Incarnation",
        "topics": ["incarnation", "jesus", "christology", "doctrine"],
        "keywords": ["incarnation", "word", "flesh", "god", "man", "virgin", "mary"],
        "text": "The incarnation is the doctrine that the eternal Son of God took on human nature in the person of Jesus Christ, without ceasing to be God. He is fully God and fully man, one person with two natures, born of the Virgin Mary by the Holy Spirit.",
    },
    {
        "id": "theology-atonement",
        "sourceId": "web",
        "reference": "Christian Theology — Atonement",
        "topics": ["atonement", "cross", "jesus", "salvation"],
        "keywords": ["atonement", "cross", "blood", "sacrifice", "propitiation", "reconciliation"],
        "text": "The atonement refers to Christ's work on the cross by which he bore the penalty for sin, satisfied divine justice, and reconciled believers to God. Scripture presents Christ's death as substitutionary, victorious, and the basis for forgiveness and new life.",
    },
    {
        "id": "theology-resurrection",
        "sourceId": "web",
        "reference": "Christian Theology — Resurrection",
        "topics": ["resurrection", "jesus", "hope", "doctrine"],
        "keywords": ["resurrection", "raised", "third day", "body", "victory", "death"],
        "text": "The resurrection of Jesus Christ from the dead on the third day is central to the Christian faith. It confirms his deity, vindicates his sacrifice, defeats death, and guarantees the future resurrection of believers to eternal life.",
    },
    {
        "id": "theology-trinity",
        "sourceId": "nicene",
        "reference": "Christian Theology — Trinity",
        "topics": ["trinity", "god", "doctrine"],
        "keywords": ["trinity", "father", "son", "holy spirit", "three persons", "one god"],
        "text": "Christians worship one God in three persons: Father, Son, and Holy Spirit. These three are co-equal, co-eternal, and of one divine essence, distinct in person but not divided in being. The Trinity is revealed in creation, redemption, and the mission of the church.",
    },
]

EASTON_ENTRIES = [
    ("Grace", ["grace", "salvation", "doctrine"], "Grace: divine kindness bestowed upon the undeserving; God's mercy as distinguished from His justice. In the New Testament, grace is the source of salvation, sanctification, and every spiritual gift."),
    ("Trinity", ["trinity", "god", "doctrine"], "Trinity: the doctrine of one God subsisting in three distinct persons — the Father, the Son, and the Holy Spirit. Though the word is not found in Scripture, the teaching is affirmed throughout the Bible."),
    ("Salvation", ["salvation", "gospel", "jesus"], "Salvation: deliverance from sin and its consequences through Jesus Christ, accomplished by his atoning death and resurrection, received through faith, and sealed by the Holy Spirit."),
    ("Repentance", ["repentance", "sin", "conversion"], "Repentance: a change of mind and heart toward God, involving sorrow for sin, turning from it, and turning to God in faith and obedience. Biblical repentance bears fruit worthy of repentance."),
    ("Prayer", ["prayer", "worship", "god"], "Prayer: communion with God through adoration, confession, thanksgiving, and supplication. Believers pray in Christ's name, according to God's will, with faith and humility."),
    ("Faith", ["faith", "belief", "doctrine"], "Faith: trust in God and reliance upon his promises, especially faith in Christ for salvation. Saving faith includes knowledge, assent, and personal trust, and produces obedience."),
    ("Sin", ["sin", "fall", "doctrine"], "Sin: any want of conformity to or transgression of God's law. Sin entered the world through Adam, affects all humanity, brings guilt and death, and can be forgiven only through Christ."),
    ("Justification", ["justification", "salvation", "doctrine"], "Justification: God's act of declaring sinners righteous in his sight through the imputation of Christ's righteousness, received by faith alone, apart from works of the law."),
    ("Sanctification", ["sanctification", "holiness", "holy spirit"], "Sanctification: the work of God's grace by which believers are renewed in the whole man after the image of God and enabled more and more to die unto sin and live unto righteousness."),
    ("Regeneration", ["regeneration", "new birth", "holy spirit"], "Regeneration: the work of the Holy Spirit in giving new spiritual life to those dead in sin, enabling them to repent and believe the gospel."),
    ("Atonement", ["atonement", "cross", "salvation"], "Atonement: reconciliation between God and sinners through the sacrificial death of Christ, who bore the penalty of sin and satisfied divine justice on behalf of his people."),
    ("Baptism", ["baptism", "sacrament", "church"], "Baptism: the sacrament instituted by Christ signifying union with him in his death and resurrection, admission into the church, and cleansing from sin, administered with water in the name of the Father, Son, and Holy Spirit."),
    ("Lord's Supper", ["lords supper", "communion", "eucharist"], "The Lord's Supper: the sacrament in which bread and wine signify the body and blood of Christ, proclaiming his death until he comes and nourishing believers by faith."),
    ("Church", ["church", "ecclesiology", "body of christ"], "Church: the whole company of those united to Christ by faith, called out from the world, indwelt by the Holy Spirit, and commissioned to worship God, proclaim the gospel, and observe the ordinances."),
    ("Holy Spirit", ["holy spirit", "pneumatology", "doctrine"], "Holy Spirit: the third person of the Trinity, equal with the Father and the Son, who convicts of sin, regenerates believers, indwells them, sanctifies them, and empowers them for service."),
    ("Covenant", ["covenant", "promise", "doctrine"], "Covenant: a solemn agreement ordained by God in which he binds himself by oath to grant blessings upon his people, fulfilled supremely in the new covenant through Christ."),
    ("Messiah", ["messiah", "christ", "prophecy"], "Messiah: the Anointed One promised in the Old Testament, fulfilled in Jesus Christ, who came to save his people from sin and establish God's kingdom."),
    ("Gospel", ["gospel", "good news", "salvation"], "Gospel: the good news that Christ died for our sins according to the Scriptures, was buried, rose again on the third day, and offers forgiveness and eternal life to all who believe."),
    ("Propitiation", ["propitiation", "atonement", "cross"], "Propitiation: the turning away of God's wrath against sin through the sacrifice of Christ, who bore the penalty sinners deserved."),
    ("Redemption", ["redemption", "salvation", "cross"], "Redemption: deliverance from sin and death through the payment of a ransom; Christ gave his life as a ransom for many."),
    ("Resurrection", ["resurrection", "jesus", "hope"], "Resurrection: the raising of Jesus bodily from the dead, guaranteeing the future resurrection of believers and confirming his victory over sin and death."),
    ("Angels", ["angels", "creation", "spiritual beings"], "Angels: spiritual beings created by God to serve him, minister to believers, and execute his will. Holy angels worship God; fallen angels, led by Satan, oppose God's purposes."),
    ("Satan", ["satan", "devil", "evil"], "Satan: the adversary, a fallen angel who tempts humanity, accuses believers, and opposes God's kingdom, yet is defeated by Christ and will be finally judged."),
    ("Heaven", ["heaven", "eternal life", "hope"], "Heaven: the dwelling place of God and the final home of the redeemed, where believers enjoy eternal fellowship with God in resurrected bodies free from sin and sorrow."),
    ("Hell", ["hell", "judgment", "eternal punishment"], "Hell: the place of final punishment for the impenitent, described in Scripture as separation from God and enduring judgment for rebellion against him."),
    ("Judgment", ["judgment", "last day", "accountability"], "Judgment: God's righteous assessment of all people. Christ will return to judge the living and the dead; believers are judged in mercy through Christ, while unbelievers face condemnation."),
    ("Law", ["law", "moses", "commandments"], "Law: God's holy standard revealed especially in the Ten Commandments and the moral teaching of Scripture, showing sinners their need of a Savior and guiding believers in righteousness."),
    ("Love", ["love", "charity", "ethics"], "Love: the supreme virtue commanded by God — love for God with all one's being and love for neighbor as oneself. God's love is shown supremely in Christ's sacrifice."),
    ("Hope", ["hope", "eschatology", "faith"], "Hope: confident expectation of God's future blessings, especially resurrection and eternal life, grounded in the promises of God and the resurrection of Christ."),
    ("Worship", ["worship", "praise", "god"], "Worship: the response of reverence, adoration, and obedience offered to God in spirit and truth through prayer, praise, Scripture, sacraments, and holy living."),
    ("Discipleship", ["discipleship", "following christ", "obedience"], "Discipleship: learning from Christ, trusting him, and obeying his commands, taking up one's cross daily and following him in faith and service."),
    ("Forgiveness", ["forgiveness", "mercy", "reconciliation"], "Forgiveness: God's gracious pardon of sin through Christ and the corresponding duty of believers to forgive others as God in Christ has forgiven them."),
    ("Mercy", ["mercy", "compassion", "god"], "Mercy: God's compassion toward sinners who deserve judgment, shown in withholding punishment and granting salvation through Christ."),
    ("Righteousness", ["righteousness", "holiness", "justification"], "Righteousness: conformity to God's holy standard. Believers receive the righteousness of Christ by imputation and are called to live righteously by the Spirit."),
    ("Temptation", ["temptation", "sin", "trials"], "Temptation: solicitation to sin, whether from the world, the flesh, or the devil. God provides a way of escape, and Christ sympathizes with those who are tempted."),
    ("Providence", ["providence", "god", "sovereignty"], "Providence: God's continuous upholding and governing of all creation according to his wise and holy will for his own glory and the good of his people."),
    ("Predestination", ["predestination", "election", "sovereignty"], "Predestination: God's eternal decree whereby he foreordains whatsoever comes to pass, including the gracious election of believers to salvation in Christ."),
    ("Election", ["election", "chosen", "salvation"], "Election: God's gracious choice of sinners unto salvation in Christ before the foundation of the world, not based on human merit but on his sovereign love."),
    ("Assurance", ["assurance", "eternal security", "faith"], "Assurance: the confidence believers may have that they are in Christ and will persevere, grounded in God's promises, the witness of the Spirit, and the fruit of faith."),
    ("Apostle", ["apostle", "church", "new testament"], "Apostle: one sent with authority, especially the twelve and Paul, eyewitnesses of the risen Christ commissioned to establish the church and authoritatively proclaim the gospel."),
    ("Prophet", ["prophet", "prophecy", "old testament"], "Prophet: one who speaks God's word to his people, foretelling future events and forth-telling God's will. Christ is the supreme Prophet, and the Scriptures are the prophetic word made sure."),
    ("Priest", ["priest", "sacrifice", "christ"], "Priest: one who offers sacrifice and intercedes for the people. Christ is the great High Priest who offered himself once for all and ever lives to intercede for believers."),
    ("King", ["king", "kingdom", "christ"], "King: a ruler with authority. Christ is King of kings, reigning now and coming again to judge and establish his kingdom in fullness."),
    ("Miracle", ["miracle", "signs", "jesus"], "Miracle: a mighty work wrought by God that reveals his power and authenticates his messengers, especially the miracles of Jesus which display the inbreaking of God's kingdom."),
    ("Parable", ["parable", "jesus", "teaching"], "Parable: an earthly story with a heavenly meaning used by Jesus to teach about the kingdom of God, revealing truth to disciples and concealing it from the hard-hearted."),
    ("Canon", ["canon", "scripture", "bible"], "Canon: the collection of books recognized as the authoritative Word of God, consisting of the Old and New Testaments, inspired by the Holy Spirit and sufficient for faith and practice."),
    ("Inspiration", ["inspiration", "scripture", "bible"], "Inspiration: the work of the Holy Spirit by which the authors of Scripture wrote exactly what God intended, so that the Bible is God-breathed and without error in all it affirms."),
    ("Heresy", ["heresy", "false teaching", "doctrine"], "Heresy: serious doctrinal error that departs from the faith once delivered to the saints, especially denial of core truths about God, Christ, salvation, or Scripture."),
    ("Idolatry", ["idolatry", "worship", "sin"], "Idolatry: giving to any creature the worship due to God alone, whether through images, false gods, or ultimate devotion to created things."),
    ("Sabbath", ["sabbath", "rest", "worship"], "Sabbath: the day of rest instituted by God, pointing to creation, redemption, and eternal rest. Under the new covenant, believers gather on the Lord's Day to worship the risen Christ."),
]

MHC_ENTRIES = [
    ("Matthew Henry on Genesis 1:1", "Genesis 1:1", ["creation", "god"], "In the beginning God created — not by necessity but by free will and wisdom. The heavens and earth were made from nothing by his word, displaying his power and preparing the stage for the history of redemption."),
    ("Matthew Henry on Genesis 3:15", "Genesis 3:15", ["fall", "messiah", "promise"], "The first gospel promise: the seed of the woman shall bruise the serpent's head. Though sin brought a curse, God immediately proclaimed hope of victory through a Redeemer who would destroy the works of the devil."),
    ("Matthew Henry on Exodus 20", "Exodus 20:1-17", ["ten commandments", "law"], "The moral law is summed up in ten commandments, revealing God's holiness and man's duty. The preface grounds obedience in redemption: 'I am the LORD your God, who brought you out of Egypt.'"),
    ("Matthew Henry on Psalm 1", "Psalm 1", ["righteousness", "wisdom"], "The blessed man delights in God's law and meditates on it day and night. He is like a tree planted by streams of water, fruitful and steadfast, while the way of the wicked perishes."),
    ("Matthew Henry on Psalm 23", "Psalm 23", ["shepherd", "comfort"], "David speaks of the Lord as his shepherd — providing, guiding, restoring, and protecting. Even in the valley of the shadow of death, God's presence removes fear. Goodness and mercy follow the believer all his days."),
    ("Matthew Henry on Psalm 51", "Psalm 51", ["repentance", "forgiveness"], "David's penitential psalm after sin teaches that God desires truth in the inward parts. Brokenness and contrition, not mere ritual, are required. Where sin abounded, grace can restore a clean heart."),
    ("Matthew Henry on Psalm 119", "Psalm 119", ["scripture", "law"], "This psalm magnifies the Word of God in every circumstance — affliction, comfort, guidance, and delight. The godly soul treasures Scripture above riches and finds life in keeping God's testimonies."),
    ("Matthew Henry on Isaiah 53", "Isaiah 53", ["messiah", "suffering"], "The suffering Servant bears our griefs and carries our sorrows. He was wounded for our transgressions and bruised for our iniquities. By his stripes we are healed; the LORD laid on him the iniquity of us all."),
    ("Matthew Henry on John 1:1", "John 1:1-5", ["logos", "deity of christ"], "Christ is the eternal Word, with God and God, by whom all things were made. In him was life and light. The Word became flesh and dwelt among us, full of grace and truth."),
    ("Matthew Henry on John 3:16", "John 3:16", ["salvation", "love"], "God's love to a lost world is shown in giving his only begotten Son. Faith in Christ is the appointed way to eternal life; unbelief leaves sinners under condemnation."),
    ("Matthew Henry on Matthew 5", "Matthew 5:3-12", ["beatitudes", "kingdom"], "The Beatitudes describe the character and blessedness of Christ's kingdom citizens: poor in spirit, mourners, meek, hungry for righteousness, merciful, pure, peacemakers, and persecuted for righteousness' sake."),
    ("Matthew Henry on Matthew 6", "Matthew 6:9-13", ["lords prayer", "prayer"], "Christ teaches his disciples to pray with reverence for the Father's name, longing for his kingdom, submission to his will, dependence for daily bread, forgiveness, and deliverance from evil."),
    ("Matthew Henry on Romans 3", "Romans 3:21-26", ["justification", "gospel"], "A righteousness from God apart from the law is revealed through faith in Jesus Christ. All have sinned, yet God justifies freely by grace through the redemption that is in Christ Jesus."),
    ("Matthew Henry on Romans 8", "Romans 8:28", ["providence", "suffering"], "All things work together for good to those who love God and are called according to his purpose. Afflictions, under God's hand, serve the eternal good of his children."),
    ("Matthew Henry on 1 Corinthians 13", "1 Corinthians 13", ["love", "virtue"], "Love is the greatest grace, without which gifts profit nothing. It is patient, kind, humble, and enduring. Faith, hope, and love abide, but the greatest of these is love."),
    ("Matthew Henry on Ephesians 2", "Ephesians 2:1-10", ["grace", "salvation"], "Believers were dead in trespasses but made alive together with Christ. By grace they are saved through faith, not of works, so that no one may boast. We are God's workmanship created in Christ Jesus for good works."),
    ("Matthew Henry on Philippians 2", "Philippians 2:5-11", ["humility", "christ"], "Christ humbled himself to death on the cross; therefore God highly exalted him. His mind is to be ours — humility, obedience, and service, trusting God for exaltation in his time."),
    ("Matthew Henry on Hebrews 11", "Hebrews 11", ["faith", "examples"], "Faith is the substance of things hoped for. The chapter recounts heroes who trusted God's promises though they did not yet receive the fullness of what was promised, looking to a better country."),
    ("Matthew Henry on James 2", "James 2:14-26", ["faith", "works"], "Faith without works is dead. True faith produces obedience, as shown by Abraham and Rahab. We are justified by works in the sense that living faith demonstrates itself in action."),
    ("Matthew Henry on 1 Peter 1", "1 Peter 1:3-9", ["hope", "trial"], "God has begotten believers to a living hope through the resurrection of Christ. Though tested by fire, faith proves genuine and results in praise and glory at the revelation of Jesus Christ."),
    ("Matthew Henry on Revelation 21", "Revelation 21:1-4", ["heaven", "new creation"], "God will make all things new. The holy city comes down; God dwells with his people. He wipes away every tear, and death, sorrow, and pain pass away."),
    ("Matthew Henry on Acts 2", "Acts 2:38-39", ["pentecost", "holy spirit"], "Peter calls Israel to repent and be baptized in the name of Jesus Christ for forgiveness of sins, with the gift of the Holy Spirit promised to them and their children and all who are far off."),
    ("Matthew Henry on Galatians 5", "Galatians 5:22-23", ["holy spirit", "fruit"], "Where the Spirit reigns, he produces love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, and self-control — graces that fulfill the law and adorn the Christian life."),
    ("Matthew Henry on Colossians 1", "Colossians 1:15-20", ["christ", "preeminence"], "Christ is the image of the invisible God, firstborn over all creation. In him all things consist. He is head of the body, the church, and in him all the fullness dwells, reconciling all things by the blood of his cross."),
    ("Matthew Henry on 2 Timothy 3", "2 Timothy 3:16-17", ["scripture", "inspiration"], "All Scripture is God-breathed and profitable for teaching, reproof, correction, and training in righteousness, that the man of God may be complete, equipped for every good work."),
]

_chapter_cache: dict[tuple[str, int], list[dict]] = {}


def slugify(value: str) -> str:
    value = value.lower().replace("'", "")
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def make_keywords(text: str, topics: list[str]) -> list[str]:
    tokens = re.findall(r"[a-z0-9']+", text.lower())
    keywords = []
    seen = set()
    for token in tokens:
        token = token.strip("'")
        if len(token) <= 2 or token in STOP_WORDS or token in seen:
            continue
        seen.add(token)
        keywords.append(token)
        if len(keywords) >= 12:
            break
    for topic in topics:
        for part in topic.lower().split():
            if part not in seen and len(part) > 2:
                seen.add(part)
                keywords.append(part)
    return keywords[:16]


def clean_verse_text(text: str) -> str:
    text = re.sub(r"\d+:\d+\s+The [^\"“]+", "", text)
    text = re.sub(r"\d+:\d+\s+[^\"“]+?(?=[\"“])", "", text)
    text = re.sub(r"[\u201c\u201d]", '"', text)
    text = re.sub(r"\s+", " ", text).strip()
    text = text.replace("only born Son", "one and only Son")
    text = text.replace("Most certainly I tell you", "Most certainly I tell you")
    return text


def fetch_chapter(book: str, chapter: int) -> list[dict]:
    key = (book, chapter)
    if key in _chapter_cache:
        return _chapter_cache[key]

    slug = BOOK_SLUGS[book]
    url = f"{BIBLE_API}/{slug}/chapters/{chapter}.json"
    request = urllib.request.Request(url, headers={"User-Agent": "eli-wise-knowledge-builder"})
    with urllib.request.urlopen(request, timeout=30) as response:
        payload = json.load(response)

    verses = {}
    for item in payload.get("data", []):
        verse_num = int(item["verse"])
        if verse_num not in verses:
            verses[verse_num] = clean_verse_text(item["text"])

    ordered = [{"verse": num, "text": verses[num]} for num in sorted(verses)]
    _chapter_cache[key] = ordered
    return ordered


def format_reference(book: str, chapter: int, start: int, end: int) -> str:
    book_name = "Psalm" if book == "Psalms" else book
    if start == end:
        return f"{book_name} {chapter}:{start}"
    return f"{book_name} {chapter}:{start}-{end}"


def build_web_chunks() -> list[dict]:
    chunks = []
    for book, chapter, start, end, topics in WEB_PASSAGES:
        verses = fetch_chapter(book, chapter)
        selected = [v for v in verses if start <= v["verse"] <= end]
        if not selected:
            raise RuntimeError(f"No verses found for {book} {chapter}:{start}-{end}")

        text = " ".join(v["text"] for v in selected)
        reference = format_reference(book, chapter, start, end)
        chunk_id = f"web-{slugify(reference)}"
        chunks.append(
            {
                "id": chunk_id,
                "sourceId": "web",
                "reference": reference,
                "topics": topics,
                "keywords": make_keywords(text, topics),
                "text": text,
            }
        )
    return chunks


def parse_wsc_chunks() -> list[dict]:
    content = RAW_WSC.read_text(encoding="utf-8")
    pattern = re.compile(
        r"Q\.\s*(\d+)\.\s*(.*?)\n\nA\.\s*(.*?)(?=\n\n```|\n\nQ\.|\Z)",
        re.DOTALL,
    )
    chunks = []
    for match in pattern.finditer(content):
        number = int(match.group(1))
        question = re.sub(r"\s+", " ", match.group(2)).strip()
        answer = re.sub(r"\s+", " ", match.group(3)).strip()
        answer = re.sub(r"\[[a-z]\]\.? ?", "", answer)
        text = f"Q: {question} A: {answer}"
        topics = infer_wsc_topics(question, answer)
        chunks.append(
            {
                "id": f"wsc-q{number}",
                "sourceId": "wsc",
                "reference": f"WSC Q{number}",
                "topics": topics,
                "keywords": make_keywords(text, topics),
                "text": text,
            }
        )
    if len(chunks) < 100:
        raise RuntimeError(f"Expected ~107 WSC chunks, found {len(chunks)}")
    return chunks


def infer_wsc_topics(question: str, answer: str) -> list[str]:
    haystack = f"{question} {answer}".lower()
    topic_map = [
        (["chief end", "glorify", "enjoy"], ["purpose", "god", "worship"]),
        (["scripture", "word of god", "bible"], ["scripture", "bible", "authority"]),
        (["god", "godhead", "trinity", "father", "son", "holy ghost"], ["god", "doctrine"]),
        (["sin", "fall", "adam", "transgression"], ["sin", "fall", "doctrine"]),
        (["christ", "jesus", "mediator", "incarnation"], ["christ", "salvation", "doctrine"]),
        (["justification", "sanctification", "adoption"], ["salvation", "grace", "doctrine"]),
        (["law", "commandment", "ten commandments"], ["law", "ethics", "doctrine"]),
        (["prayer", "lord's prayer"], ["prayer", "worship"]),
        (["sacrament", "baptism", "lord's supper"], ["sacraments", "church"]),
        (["church", "visible church"], ["church", "ecclesiology"]),
    ]
    topics = []
    for keys, labels in topic_map:
        if any(key in haystack for key in keys):
            topics.extend(labels)
    if not topics:
        topics = ["doctrine", "catechism"]
    deduped = []
    for topic in topics:
        if topic not in deduped:
            deduped.append(topic)
    return deduped[:6]


def build_easton_chunks() -> list[dict]:
    chunks = []
    for title, topics, text in EASTON_ENTRIES:
        chunks.append(
            {
                "id": f"easton-{slugify(title)}",
                "sourceId": "easton",
                "reference": f"Easton's Bible Dictionary — {title}",
                "topics": topics,
                "keywords": make_keywords(text, topics),
                "text": text,
            }
        )
    return chunks


def build_mhc_chunks() -> list[dict]:
    chunks = []
    for title, reference, topics, text in MHC_ENTRIES:
        chunks.append(
            {
                "id": f"mhc-{slugify(reference)}",
                "sourceId": "mhc",
                "reference": title,
                "topics": topics,
                "keywords": make_keywords(text, topics),
                "text": text,
            }
        )
    return chunks


def write_json(path: Path, data: list[dict]) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    web_chunks = build_web_chunks()
    wsc_chunks = parse_wsc_chunks()
    easton_chunks = build_easton_chunks()
    mhc_chunks = build_mhc_chunks()
    creed_chunks = CREEDS_AND_THEOLOGY

    write_json(OUT_DIR / "web.json", web_chunks)
    write_json(OUT_DIR / "wsc.json", wsc_chunks)
    write_json(OUT_DIR / "easton.json", easton_chunks)
    write_json(OUT_DIR / "mhc.json", mhc_chunks)
    write_json(OUT_DIR / "creeds.json", creed_chunks)

    total = len(web_chunks) + len(wsc_chunks) + len(easton_chunks) + len(mhc_chunks) + len(creed_chunks)
    print(f"Generated {total} knowledge chunks:")
    print(f"  WEB scripture: {len(web_chunks)}")
    print(f"  Westminster Shorter Catechism: {len(wsc_chunks)}")
    print(f"  Easton's Dictionary: {len(easton_chunks)}")
    print(f"  Matthew Henry Commentary: {len(mhc_chunks)}")
    print(f"  Creeds & theology overviews: {len(creed_chunks)}")


if __name__ == "__main__":
    main()
