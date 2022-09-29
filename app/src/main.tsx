import { render } from 'preact'
import { App } from './app'
import './index.css'

const pulssiData = {
  "koulutukset": {
    "by_tila": {
      "julkaistu_amount": 2275,
      "arkistoitu_amount": 190
    },
    "by_tyyppi": {
      "aikuisten-perusopetus": {
        "julkaistu_amount": 1,
        "arkistoitu_amount": 0
      },
      "amk": {
        "julkaistu_amount": 531,
        "arkistoitu_amount": 63
      },
      "amm": {
        "julkaistu_amount": 146,
        "arkistoitu_amount": 14
      },
      "amm-muu": {
        "julkaistu_amount": 6,
        "arkistoitu_amount": 0
      },
      "amm-osaamisala": {
        "julkaistu_amount": 21,
        "arkistoitu_amount": 6
      },
      "amm-tutkinnon-osa": {
        "julkaistu_amount": 112,
        "arkistoitu_amount": 9
      },
      "kk-muu": {
        "julkaistu_amount": 3,
        "arkistoitu_amount": 0,
        "kk-opintokokonaisuus": {
          "julkaistu_amount": 2,
          "arkistoitu_amount": 0
        },
        "ope-pedag-opinnot": {
          "julkaistu_amount": 1,
          "arkistoitu_amount": 0
        }
      },
      "lk": {
        "julkaistu_amount": 10,
        "arkistoitu_amount": 3
      },
      "telma": {
        "julkaistu_amount": 1,
        "arkistoitu_amount": 0
      },
      "tuva": {
        "julkaistu_amount": 1,
        "arkistoitu_amount": 0
      },
      "vapaa-sivistystyo": {
        "julkaistu_amount": 234,
        "arkistoitu_amount": 5,
        "vapaa-sivistystyo-muu": {
          "julkaistu_amount": 233,
          "arkistoitu_amount": 5
        },
        "vapaa-sivistystyo-opistovuosi": {
          "julkaistu_amount": 1,
          "arkistoitu_amount": 0
        }
      },
      "yo": {
        "julkaistu_amount": 1209,
        "arkistoitu_amount": 90
      }
    }
  },
  "toteutukset": {
    "by_tila": {
      "julkaistu_amount": 6583,
      "arkistoitu_amount": 985
    },
    "by_tyyppi": {
      "aikuisten-perusopetus": {
        "julkaistu_amount": 3,
        "arkistoitu_amount": 0
      },
      "amk": {
        "julkaistu_amount": 1493,
        "arkistoitu_amount": 193,
        "amk-alempi": {
          "julkaistu_amount": 1037,
          "arkistoitu_amount": 131
        },
        "amk-ylempi": {
          "julkaistu_amount": 455,
          "arkistoitu_amount": 61
        }
      },
      "amm": {
        "julkaistu_amount": 2688,
        "arkistoitu_amount": 508,
        "koulutustyyppi_11": {
          "julkaistu_amount": 570,
          "arkistoitu_amount": 54
        },
        "koulutustyyppi_12": {
          "julkaistu_amount": 234,
          "arkistoitu_amount": 22
        },
        "koulutustyyppi_13": {
          "julkaistu_amount": 1599,
          "arkistoitu_amount": 383
        },
        "koulutustyyppi_1": {
          "julkaistu_amount": 201,
          "arkistoitu_amount": 37
        },
        "koulutustyyppi_4": {
          "julkaistu_amount": 84,
          "arkistoitu_amount": 12
        }
      },
      "koulutustyyppi_1": {
        "julkaistu_amount": 1599,
        "arkistoitu_amount": 383,
        "koulutustyyppi_26": {
          "julkaistu_amount": 1800,
          "arkistoitu_amount": 420
        }
      },
      "amm-muu": {
        "julkaistu_amount": 6,
        "arkistoitu_amount": 0
      },
      "amm-osaamisala": {
        "julkaistu_amount": 17,
        "arkistoitu_amount": 7
      },
      "amm-tutkinnon-osa": {
        "julkaistu_amount": 120,
        "arkistoitu_amount": 23
      },
      "kk-muu": {
        "julkaistu_amount": 2,
        "arkistoitu_amount": 0,
        "kk-opintokokonaisuus": {
          "julkaistu_amount": 1,
          "arkistoitu_amount": 0
        },
        "ope-pedag-opinnot": {
          "julkaistu_amount": 1,
          "arkistoitu_amount": 0
        }
      },
      "lk": {
        "julkaistu_amount": 440,
        "arkistoitu_amount": 69
      },
      "telma": {
        "julkaistu_amount": 17,
        "arkistoitu_amount": 2
      },
      "tuva": {
        "julkaistu_amount": 130,
        "arkistoitu_amount": 15,
        "tuva-erityisopetus": {
          "julkaistu_amount": 19,
          "arkistoitu_amount": 4
        },
        "tuva-normal": {
          "julkaistu_amount": 111,
          "arkistoitu_amount": 11
        }
      },
      "vapaa-sivistystyo": {
        "julkaistu_amount": 283,
        "arkistoitu_amount": 12,
        "vapaa-sivistystyo-muu": {
          "julkaistu_amount": 234,
          "arkistoitu_amount": 12
        },
        "vapaa-sivistystyo-opistovuosi": {
          "julkaistu_amount": 49,
          "arkistoitu_amount": 0
        }
      },
      "yo": {
        "julkaistu_amount": 1384,
        "arkistoitu_amount": 156,
        "kandi": {
          "julkaistu_amount": 32,
          "arkistoitu_amount": 7
        },
        "kandi-ja-maisteri": {
          "julkaistu_amount": 403,
          "arkistoitu_amount": 65
        },
        "maisteri": {
          "julkaistu_amount": 737,
          "arkistoitu_amount": 29
        },
        "tohtori": {
          "julkaistu_amount": 180,
          "arkistoitu_amount": 45
        }
      }
    }
  },
  "hakukohteet": {
    "by_tila": {
      "julkaistu_amount": 10496,
      "arkistoitu_amount": 2747
    },
    "by_tyyppi": {
      "aikuisten-perusopetus": {
        "julkaistu_amount": 2,
        "arkistoitu_amount": 0
      },
      "amk": {
        "julkaistu_amount": 3880,
        "arkistoitu_amount": 1793,
        "amk-alempi": {
          "julkaistu_amount": 2901,
          "arkistoitu_amount": 1323
        },
        "amk-ylempi": {
          "julkaistu_amount": 978,
          "arkistoitu_amount": 468
        }
      },
      "amm": {
        "julkaistu_amount": 3397,
        "arkistoitu_amount": 653,
        "koulutustyyppi_11": {
          "julkaistu_amount": 585,
          "arkistoitu_amount": 119
        },
        "koulutustyyppi_12": {
          "julkaistu_amount": 237,
          "arkistoitu_amount": 52
        },
        "koulutustyyppi_13": {
          "julkaistu_amount": 2124,
          "arkistoitu_amount": 416
        },
        "koulutustyyppi_1": {
          "julkaistu_amount": 258,
          "arkistoitu_amount": 30
        },
        "koulutustyyppi_4": {
          "julkaistu_amount": 193,
          "arkistoitu_amount": 36
        }
      },
      "koulutustyyppi_1": {
        "julkaistu_amount": 2124,
        "arkistoitu_amount": 416,
        "koulutustyyppi_26": {
          "julkaistu_amount": 2382,
          "arkistoitu_amount": 446
        }
      },
      "amm-osaamisala": {
        "julkaistu_amount": 6,
        "arkistoitu_amount": 1
      },
      "amm-tutkinnon-osa": {
        "julkaistu_amount": 32,
        "arkistoitu_amount": 22
      },
      "kk-muu": {
        "julkaistu_amount": 1,
        "arkistoitu_amount": 0,
        "kk-opintokokonaisuus": {
          "julkaistu_amount": 1,
          "arkistoitu_amount": 0
        }
      },
      "lk": {
        "julkaistu_amount": 628,
        "arkistoitu_amount": 8
      },
      "telma": {
        "julkaistu_amount": 61,
        "arkistoitu_amount": 8
      },
      "tuva": {
        "julkaistu_amount": 239,
        "arkistoitu_amount": 6,
        "tuva-erityisopetus": {
          "julkaistu_amount": 50,
          "arkistoitu_amount": 0
        },
        "tuva-normal": {
          "julkaistu_amount": 189,
          "arkistoitu_amount": 6
        }
      },
      "vapaa-sivistystyo": {
        "julkaistu_amount": 91,
        "arkistoitu_amount": 3,
        "vapaa-sivistystyo-muu": {
          "julkaistu_amount": 4,
          "arkistoitu_amount": 2
        },
        "vapaa-sivistystyo-opistovuosi": {
          "julkaistu_amount": 87,
          "arkistoitu_amount": 1
        }
      },
      "yo": {
        "julkaistu_amount": 2159,
        "arkistoitu_amount": 253,
        "kandi": {
          "julkaistu_amount": 54,
          "arkistoitu_amount": 6
        },
        "kandi-ja-maisteri": {
          "julkaistu_amount": 997,
          "arkistoitu_amount": 75
        },
        "maisteri": {
          "julkaistu_amount": 825,
          "arkistoitu_amount": 18
        },
        "tohtori": {
          "julkaistu_amount": 238,
          "arkistoitu_amount": 145
        }
      }
    }
  },
  "haut": {
    "by_tila": {
      "julkaistu_amount": 1156,
      "arkistoitu_amount": 306
    },
    "by_hakutapa": {
      "hakutapa_01": {
        "julkaistu_amount": 5,
        "arkistoitu_amount": 8
      },
      "hakutapa_02": {
        "julkaistu_amount": 257,
        "arkistoitu_amount": 92
      },
      "hakutapa_03": {
        "julkaistu_amount": 839,
        "arkistoitu_amount": 179
      },
      "hakutapa_04": {
        "julkaistu_amount": 19,
        "arkistoitu_amount": 2
      },
      "hakutapa_05": {
        "julkaistu_amount": 24,
        "arkistoitu_amount": 23
      },
      "hakutapa_06": {
        "julkaistu_amount": 12,
        "arkistoitu_amount": 2
      }
    }
  }
};

render(<App data={pulssiData as any}/>, document.getElementById('app') as HTMLElement)
