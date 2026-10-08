<?xml version="1.0" encoding="UTF-8"?>
<!--
    Гласник — XSLT за TEI речници
    =================================================================
    Превръща TEI речник (entry / form / gramGrp / sense / cit / xr / hom)
    в чист HTML с класове от css/style.css на Гласник.
    Без вградени стилове и без излишни span елементи: всеки TEI елемент
    дава най-много един HTML елемент, а оформлението е в CSS.

    XSLT 1.0 — работи в eXist-db (transform:transform), в браузъра,
    в xsltproc и в Saxon.

    Параметри:
      standalone = 'yes'  пълна HTML страница (по подразбиране)
                   'no'   само <div class="glasnik-dictionary"> за вграждане
                          в шаблон на eXist (templates/page.html)
      css        = път до style.css (само при standalone='yes')
      entry      = xml:id на една статия; празно = всички

    Пример (командна линия):
      xsltproc xslt/glasnik-dictionary.xsl data/ternovka.xml > речник.html
      xsltproc (параметър entry=абедня) xslt/glasnik-dictionary.xsl data/ternovka.xml

    Пример (eXist, XQuery):
      transform:transform(doc("/db/apps/glasnik/data/ternovka.xml"),
          doc("/db/apps/glasnik/xslt/glasnik-dictionary.xsl"),
          <parameters><param name="standalone" value="no"/></parameters>)
-->
<xsl:stylesheet version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:tei="http://www.tei-c.org/ns/1.0"
    exclude-result-prefixes="tei">

    <xsl:output method="html" encoding="UTF-8" indent="yes"/>
    <xsl:strip-space elements="*"/>

    <xsl:param name="standalone" select="'yes'"/>
    <xsl:param name="css" select="'../css/style.css'"/>
    <xsl:param name="entry" select="''"/>


    <!-- ============ Страница ============ -->

    <xsl:template match="/">
        <xsl:choose>
            <xsl:when test="$standalone = 'yes'">
                <xsl:text disable-output-escaping="yes">&lt;!DOCTYPE html&gt;&#10;</xsl:text>
                <html lang="bg">
                    <head>
                        <meta charset="UTF-8"/>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
                        <title><xsl:value-of select="//tei:titleStmt/tei:title"/></title>
                        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,400;0,700;1,400&amp;family=Noto+Serif:ital,wght@0,400;0,700;1,400&amp;display=swap"/>
                        <link rel="stylesheet" href="{$css}"/>
                    </head>
                    <body>
                        <main class="section">
                            <div class="container">
                                <xsl:call-template name="dictionary"/>
                            </div>
                        </main>
                    </body>
                </html>
            </xsl:when>
            <xsl:otherwise>
                <xsl:call-template name="dictionary"/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <xsl:template name="dictionary">
        <div class="glasnik-dictionary">
            <header class="dict-header">
                <h1><xsl:value-of select="//tei:titleStmt/tei:title"/></h1>
                <p class="dict-source">
                    <xsl:value-of select="//tei:sourceDesc/tei:bibl"/>
                    <xsl:if test="//tei:titleStmt/tei:editor">
                        <xsl:text>. TEI: </xsl:text>
                        <xsl:value-of select="//tei:titleStmt/tei:editor"/>
                    </xsl:if>
                    <xsl:if test="//tei:licence/@target">
                        <xsl:text>. </xsl:text>
                        <a href="{//tei:licence/@target}">Лиценз</a>
                    </xsl:if>
                </p>
            </header>
            <xsl:choose>
                <xsl:when test="$entry != ''">
                    <xsl:apply-templates select="//tei:body/tei:entry[@xml:id = $entry]"/>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:apply-templates select="//tei:body/tei:entry"/>
                </xsl:otherwise>
            </xsl:choose>
        </div>
    </xsl:template>


    <!-- ============ Статия ============ -->

    <xsl:template match="tei:body/tei:entry">
        <article class="card dict-entry" id="{@xml:id}">
            <!-- заглавна дума и граматика -->
            <xsl:apply-templates select="tei:form[1]" mode="head"/>
            <!-- варианти -->
            <xsl:if test="tei:form[@type='variant'] | tei:form[1]/tei:form[@type='variant']">
                <p class="dict-variants">
                    <xsl:text>Варианти: </xsl:text>
                    <xsl:for-each select="tei:form[@type='variant'] | tei:form[1]/tei:form[@type='variant']">
                        <xsl:if test="position() &gt; 1">, </xsl:if>
                        <xsl:value-of select="normalize-space(tei:orth)"/>
                    </xsl:for-each>
                </p>
            </xsl:if>
            <!-- значения: директно или в омоними -->
            <xsl:if test="tei:sense">
                <xsl:call-template name="senses"/>
            </xsl:if>
            <xsl:apply-templates select="tei:hom"/>
            <!-- изрази -->
            <xsl:if test="tei:entry">
                <dl class="dict-phrases">
                    <xsl:apply-templates select="tei:entry"/>
                </dl>
            </xsl:if>
            <xsl:apply-templates select="tei:xr | tei:etym"/>
        </article>
    </xsl:template>

    <xsl:template match="tei:form" mode="head">
        <h2 class="entry-word">
            <xsl:choose>
                <xsl:when test="tei:stress"><xsl:value-of select="normalize-space(tei:stress)"/></xsl:when>
                <xsl:otherwise><xsl:value-of select="normalize-space(tei:orth)"/></xsl:otherwise>
            </xsl:choose>
        </h2>
        <xsl:if test="tei:gramGrp/* or ../tei:gramGrp/* or tei:pron">
            <p class="entry-pos">
                <xsl:for-each select="tei:gramGrp/* | ../tei:gramGrp/*">
                    <xsl:if test="position() &gt; 1"><xsl:text> </xsl:text></xsl:if>
                    <abbr class="dict-gram"><xsl:value-of select="normalize-space(.)"/></abbr>
                </xsl:for-each>
                <xsl:apply-templates select="tei:pron"/>
            </p>
        </xsl:if>
    </xsl:template>

    <xsl:template match="tei:pron">
        <xsl:text> </xsl:text>
        <span class="dict-pron">[<xsl:value-of select="normalize-space(.)"/>]</span>
    </xsl:template>


    <!-- ============ Значения ============ -->

    <xsl:template name="senses">
        <ol>
            <xsl:attribute name="class">
                <xsl:text>dict-senses</xsl:text>
                <xsl:if test="count(tei:sense) = 1"> single</xsl:if>
            </xsl:attribute>
            <xsl:apply-templates select="tei:sense"/>
        </ol>
    </xsl:template>

    <xsl:template match="tei:sense">
        <li>
            <xsl:if test="@n and count(../tei:sense) &gt; 1">
                <xsl:attribute name="value"><xsl:value-of select="@n"/></xsl:attribute>
            </xsl:if>
            <xsl:apply-templates select="tei:lbl | tei:usg"/>
            <xsl:choose>
                <xsl:when test="tei:def">
                    <xsl:apply-templates select="tei:def"/>
                </xsl:when>
                <xsl:when test="not(*)">
                    <!-- <sense>текст</sense> без <def> -->
                    <span class="dict-def"><xsl:value-of select="normalize-space(.)"/></span>
                </xsl:when>
            </xsl:choose>
            <xsl:if test="tei:cit">
                <ul class="dict-examples">
                    <xsl:apply-templates select="tei:cit"/>
                </ul>
            </xsl:if>
            <xsl:apply-templates select="tei:xr"/>
        </li>
    </xsl:template>

    <xsl:template match="tei:lbl | tei:usg">
        <span class="dict-label"><xsl:value-of select="normalize-space(.)"/></span>
        <xsl:text> </xsl:text>
    </xsl:template>

    <xsl:template match="tei:def">
        <xsl:if test="preceding-sibling::tei:def">; </xsl:if>
        <span class="dict-def"><xsl:value-of select="normalize-space(.)"/></span>
    </xsl:template>

    <xsl:template match="tei:cit">
        <li><xsl:value-of select="normalize-space(tei:quote)"/></li>
    </xsl:template>


    <!-- ============ Омоними ============ -->

    <xsl:template match="tei:hom">
        <section class="dict-hom-block">
            <span class="dict-hom">
                <xsl:number format="I"/>
            </span>
            <xsl:if test="tei:gramGrp/*">
                <xsl:text> </xsl:text>
                <span class="entry-pos">
                    <xsl:for-each select="tei:gramGrp/*">
                        <xsl:if test="position() &gt; 1"><xsl:text> </xsl:text></xsl:if>
                        <abbr class="dict-gram"><xsl:value-of select="normalize-space(.)"/></abbr>
                    </xsl:for-each>
                </span>
            </xsl:if>
            <xsl:call-template name="senses"/>
            <xsl:apply-templates select="tei:xr"/>
        </section>
    </xsl:template>


    <!-- ============ Изрази (вложени entry) ============ -->

    <xsl:template match="tei:entry/tei:entry">
        <dt>
            <xsl:for-each select="tei:form">
                <xsl:if test="position() &gt; 1">, </xsl:if>
                <xsl:value-of select="normalize-space(.)"/>
            </xsl:for-each>
        </dt>
        <dd>
            <xsl:for-each select="tei:sense">
                <xsl:choose>
                    <xsl:when test="tei:def"><xsl:apply-templates select="tei:lbl | tei:usg | tei:def"/></xsl:when>
                    <xsl:otherwise><span class="dict-def"><xsl:value-of select="normalize-space(.)"/></span></xsl:otherwise>
                </xsl:choose>
                <xsl:if test="tei:cit">
                    <ul class="dict-examples">
                        <xsl:apply-templates select="tei:cit"/>
                    </ul>
                </xsl:if>
            </xsl:for-each>
        </dd>
    </xsl:template>


    <!-- ============ Препратки и произход ============ -->

    <xsl:template match="tei:xr">
        <p class="dict-see">
            <xsl:text>Вж. </xsl:text>
            <xsl:for-each select="tei:ref">
                <xsl:if test="position() &gt; 1">, </xsl:if>
                <xsl:variable name="target" select="substring-after(@target, '#')"/>
                <xsl:choose>
                    <xsl:when test="//tei:entry[@xml:id = $target]">
                        <a class="dict-xr" href="#{$target}"><xsl:value-of select="normalize-space(.)"/></a>
                    </xsl:when>
                    <xsl:otherwise>
                        <span class="dict-xr dict-xr-missing" title="Статията още не е въведена">
                            <xsl:value-of select="normalize-space(.)"/>
                        </span>
                    </xsl:otherwise>
                </xsl:choose>
            </xsl:for-each>
        </p>
    </xsl:template>

    <xsl:template match="tei:etym">
        <p class="dict-etym"><xsl:value-of select="normalize-space(.)"/></p>
    </xsl:template>

</xsl:stylesheet>
