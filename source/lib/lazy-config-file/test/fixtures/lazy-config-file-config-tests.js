
'use strict';

module.exports = [{
    id: '#1',
    config: undefined,
    firstErrorMessage: 'should be object'
}, {
    id: '#2',
    config: {},
    firstErrorMessage: 'should have required property \'version\''
}, {
    id: '#3',
    config: {
        version: 0
    },
    firstErrorMessage: 'should be >= 1'
}, {
    id: '#4',
    config: {
        version: 2
    },
    firstErrorMessage: 'should be <= 1'
}, {
    id: '#5',
    config: {
        version: 1
    },
    firstErrorMessage: 'should have required property \'service_url\''
}, {
    id: '#6',
    config: {
        version: 1,
        service_url: 1
    },
    firstErrorMessage: 'should be string'
}, {
    id: '#7',
    config: {
        version: 1,
        service_url: ''
    },
    firstErrorMessage: 'should NOT be shorter than 8 characters'
}, {
    id: '#8',
    config: {
        version: 1,
        service_url: 'http://a.co'
    },
    firstErrorMessage: 'should have required property \'engine_pipeline\''
}, {
    id: '#9',
    config: {
        version: 1,
        service_url: 'https://a.co'
    },
    firstErrorMessage: 'should have required property \'engine_pipeline\''
}, {
    id: '#10',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: null
    },
    firstErrorMessage: 'should be object'
}, {
    id: '#11',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {}
    },
    firstErrorMessage: 'should NOT have less than 1 properties'
}, {
    id: '#12',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            bundle: [],
            sequence: []
        }
    },
    firstErrorMessage: 'should NOT have more than 1 properties'
}, {
    id: '#13',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            test: {}
        }
    },
    firstErrorMessage: 'should NOT have additional properties'
}, {
    id: '#14',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            bundle: 123
        }
    },
    firstErrorMessage: 'should be array'
}, {
    id: '#15',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            bundle: []
        }
    },
    firstErrorMessage: 'should NOT have less than 1 items'
}, {
    id: '#16',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            bundle: ['test']
        }
    },
    firstErrorMessage: 'should be object'
}, {
    id: '#17',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            bundle: [{}]
        }
    },
    firstErrorMessage: 'should NOT have less than 1 properties'
}, {
    id: '#18',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            bundle: [{
                test: 'test'
            }]
        }
    },
    firstErrorMessage: 'should match exactly one schema in oneOf'
}, {
    id: '#19',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            bundle: [{
                sequence: 'test'
            }]
        }
    },
    firstErrorMessage: 'should be array'
}, {
    id: '#20',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            bundle: [{
                sequence: []
            }]
        }
    },
    firstErrorMessage: 'should NOT have less than 1 items'
}, {
    id: '#21',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            bundle: [{
                sequence: ['test']
            }]
        }
    },
    firstErrorMessage: 'should be object'
}, {
    id: '#22',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            bundle: [{
                sequence: [{}]
            }]
        }
    },
    firstErrorMessage: 'should NOT have less than 1 properties'
}, {
    id: '#23',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            bundle: [{
                sequence: [{
                    test: 'test'
                }]
            }]
        }
    },
    firstErrorMessage: 'should match exactly one schema in oneOf'
}, {
    id: '#24',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            bundle: [{
                sequence: [{
                    test: {}
                }]
            }]
        }
    },
    firstErrorMessage: 'should have required property \'engines\''
}, {
    id: '#25',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: 123
        }
    },
    firstErrorMessage: 'should be array'
}, {
    id: '#26',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: []
        }
    },
    firstErrorMessage: 'should NOT have less than 1 items'
}, {
    id: '#27',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: ['test']
        }
    },
    firstErrorMessage: 'should be object'
}, {
    id: '#28',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{}]
        }
    },
    firstErrorMessage: 'should NOT have less than 1 properties'
}, {
    id: '#29',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: 'test'
            }]
        }
    },
    firstErrorMessage: 'should match exactly one schema in oneOf'
}, {
    id: '#30',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                sequence: 'test'
            }]
        }
    },
    firstErrorMessage: 'should be array'
}, {
    id: '#31',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                sequence: []
            }]
        }
    },
    firstErrorMessage: 'should NOT have less than 1 items'
}, {
    id: '#32',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                sequence: ['test']
            }]
        }
    },
    firstErrorMessage: 'should be object'
}, {
    id: '#33',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                sequence: [{}]
            }]
        }
    },
    firstErrorMessage: 'should NOT have less than 1 properties'
}, {
    id: '#34',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                bundle: [{
                    test: 'test'
                }]
            }]
        }
    },
    firstErrorMessage: 'should match exactly one schema in oneOf'
}, {
    id: '#35',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                bundle: [{
                    test: {}
                }]
            }]
        }
    },
    firstErrorMessage: 'should have required property \'engines\''
}, {
    id: '#36',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                bundle: [{
                    test: {}
                }],
                sequence: [{
                    test: {}
                }]
            }]
        }
    },
    firstErrorMessage: 'should NOT have more than 1 properties'
}, {
    id: '#37',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                bundle: [{
                    test: {}
                }]
            }, {
                sequence: [{
                    test: {}
                }]
            }]
        }
    },
    firstErrorMessage: 'should have required property \'engines\''
}, {
    id: '#38',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                bundle: [{
                    test: {},
                    test2: {}
                }]
            }, {
                sequence: [{
                    test: {}
                }]
            }]
        }
    },
    firstErrorMessage: 'should NOT have more than 1 properties'
}, {
    id: '#39',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                bundle: [{
                    test: {}
                }]
            }, {
                sequence: [{
                    test: {},
                    test2: {}
                }]
            }]
        }
    },
    firstErrorMessage: 'should NOT have more than 1 properties'
}, {
    id: '#40',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: 'test'
    },
    firstErrorMessage: 'should be object'
}, {
    id: '#41',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {}
    },
    firstErrorMessage: 'should NOT have less than 1 properties'
}, {
    id: '#42',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            '': {}
        }
    },
    firstErrorMessage: 'should NOT have additional properties'
}, {
    id: '#43',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: 'test'
        }
    },
    firstErrorMessage: 'should be object'
}, {
    id: '#44',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {}
        }
    },
    firstErrorMessage: 'should have required property \'image\''
}, {
    id: '#45',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: null
            }
        }
    },
    firstErrorMessage: 'should be string'
}, {
    id: '#46',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: ''
            }
        }
    },
    firstErrorMessage: 'should NOT be shorter than 3 characters'
}, {
    id: '#47',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'xyz'
            }
        }
    },
    firstErrorMessage: 'should match pattern "^.+:.+$"'
}, {
    id: '#48',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                test: null
            }
        }
    },
    firstErrorMessage: 'should NOT have additional properties'
}, {
    id: 'test engine.command #1',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                working_dir: null
            }
        }
    },
    firstErrorMessage: 'should be string'
}, {
    id: 'test engine.command #2',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                command: ''
            }
        }
    },
    firstErrorMessage: 'should NOT be shorter than 1 characters'
}, {
    id: 'test engine.command #3',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                command: 'x'
            }
        }
    }
}, {
    id: 'test engine.working_dir #1',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                working_dir: 123
            }
        }
    },
    firstErrorMessage: 'should be string'
}, {
    id: 'test engine.working_dir #2',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                working_dir: ''
            }
        }
    },
    firstErrorMessage: 'should NOT be shorter than 1 characters'
}, {
    id: 'test engine.working_dir #3',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                working_dir: 'x'
            }
        }
    }
}, {
    id: 'test engine.volumes #1',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                volumes: 'test'
            }
        }
    },
    firstErrorMessage: 'should be array'
}, {
    id: 'test engine.volumes #2',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                volumes: []
            }
        }
    },
    firstErrorMessage: 'should NOT have less than 1 items'
}, {
    id: 'test engine.volumes #3',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                volumes: [123]
            }
        }
    },
    firstErrorMessage: 'should be string'
}, {
    id: 'test engine.volumes #4',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                volumes: ['123']
            }
        }
    },
    firstErrorMessage: 'should match pattern "^.*:.*$"'
}, {
    id: 'test engine.volumes #5',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                volumes: ['1:2']
            }
        }
    }
}, {
    id: 'test engine.volumes #6',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                volumes: ['1:2', '1:2']
            }
        }
    },
    firstErrorMessage: 'should NOT have duplicate items (items ## 0 and 1 are identical)'
}, {
    id: 'test engine.port #1',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                port: null
            }
        }
    },
    firstErrorMessage: 'should be integer'
}, {
    id: 'test engine.port #2',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                port: 0
            }
        }
    },
    firstErrorMessage: 'should be >= 1'
}, {
    id: 'test engine.port #3',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                port: 123
            }
        }
    }
}, {
    id: 'test engine.boot_wait #1',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                boot_wait: null
            }
        }
    },
    firstErrorMessage: 'should be boolean'
}, {
    id: 'test engine.boot_wait #2',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                boot_wait: true
            }
        }
    }
}, {
    id: 'test engine.boot_timeout #1',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                boot_timeout: null
            }
        }
    },
    firstErrorMessage: 'should be integer'
}, {
    id: 'test engine.boot_timeout #2',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                boot_timeout: 0
            }
        }
    },
    firstErrorMessage: 'should be >= 1'
}, {
    id: 'test engine.boot_timeout #3',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                boot_timeout: 123
            }
        }
    }
}, {
    id: 'test engine.meta #1',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                meta: null
            }
        }
    },
    firstErrorMessage: 'should be object'
}, {
    id: 'test engine.meta #2',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                meta: {}
            }
        }
    }
}, {
    id: 'test engine.meta #3',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                meta: {
                    languages: 'test'
                }
            }
        }
    },
    firstErrorMessage: 'should be array'
}, {
    id: 'test engine.meta #4',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                meta: {
                    languages: []
                }
            }
        }
    }
}, {
    id: 'test engine.meta #5',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                meta: {
                    languages: [123]
                }
            }
        }
    },
    firstErrorMessage: 'should be string'
}, {
    id: 'test engine.meta #6',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                meta: {
                    languages: ['123']
                }
            }
        }
    }
}, {
    id: 'test engine.meta #7',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                meta: {
                    languages: ['123'],
                    additional: 'property-test'
                }
            }
        }
    }
}, {
    id: 'test engine.env #1',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                env: 'test'
            }
        }
    },
    firstErrorMessage: 'should be array'
}, {
    id: 'test engine.env #2',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                env: []
            }
        }
    },
    firstErrorMessage: 'should NOT have less than 1 items'
}, {
    id: 'test engine.env #3',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                env: [123]
            }
        }
    },
    firstErrorMessage: 'should be string'
}, {
    id: 'test engine.env #4',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                env: ['12']
            }
        }
    },
    firstErrorMessage: 'should match pattern "^.+=.*$"'
}, {
    id: 'test engine.env #5',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                env: ['1=']
            }
        }
    }
}, {
    id: 'test engine.env #6',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                env: ['1=', '1=']
            }
        }
    },
    firstErrorMessage: 'should NOT have duplicate items (items ## 0 and 1 are identical)'
}, {
    id: 'test engine.import_env #1',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                import_env: 'test'
            }
        }
    },
    firstErrorMessage: 'should be array'
}, {
    id: 'test engine.import_env #2',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                import_env: []
            }
        }
    },
    firstErrorMessage: 'should NOT have less than 1 items'
}, {
    id: 'test engine.import_env #3',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                import_env: [123]
            }
        }
    },
    firstErrorMessage: 'should be string'
}, {
    id: 'test engine.import_env #4',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                import_env: ['']
            }
        }
    },
    firstErrorMessage: 'should NOT be shorter than 1 characters'
}, {
    id: 'test engine.import_env #5',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                import_env: ['x']
            }
        }
    }
}, {
    id: 'test engine.import_env #6',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                import_env: ['x', 'x']
            }
        }
    },
    firstErrorMessage: 'should NOT have duplicate items (items ## 0 and 1 are identical)'
}, {
    id: 'test engine.config #1',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                config: null
            }
        }
    },
    firstErrorMessage: 'should be object'
}, {
    id: 'test engine.config #2',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                config: {}
            }
        }
    }
}, {
    id: 'test engine.config #3',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                config: {
                    whatever: 'we want'
                }
            }
        }
    }
}, {
    id: 'test engine.config #4',
    config: {
        version: 1,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b',
                config: {
                    whatever: 'we want',
                    as: ['much', 'as', 'we', 'want']
                }
            }
        }
    }
}, {
    id: 'test repository_auth #1',
    config: {
        version: 1,
        repository_auth: null,
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b'
            }
        }
    },
    firstErrorMessage: 'should match exactly one schema in oneOf'
}, {
    id: 'test repository_auth #2',
    config: {
        version: 1,
        repository_auth: {},
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b'
            }
        }
    },
    firstErrorMessage: 'should match exactly one schema in oneOf'
}, {
    id: 'test repository_auth #3',
    config: {
        version: 1,
        repository_auth: {
            test: 'this'
        },
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b'
            }
        }
    },
    firstErrorMessage: 'should match exactly one schema in oneOf'
}, {
    id: 'test repository_auth #4',
    config: {
        version: 1,
        repository_auth: {
            username_env: 'test'
        },
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b'
            }
        }
    },
    firstErrorMessage: 'should match exactly one schema in oneOf'
}, {
    id: 'test repository_auth #5',
    config: {
        version: 1,
        repository_auth: {
            username_env: 'test',
            password_env: 123
        },
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b'
            }
        }
    },
    firstErrorMessage: 'should match exactly one schema in oneOf'
}, {
    id: 'test repository_auth #6',
    config: {
        version: 1,
        repository_auth: {
            username_env: 'test',
            password_env: '123'
        },
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b'
            }
        }
    }
}, {
    id: 'test repository_auth #7',
    config: {
        version: 1,
        repository_auth: {
            username_env: 'test',
            password_env: '',
            fail: 'this'
        },
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b'
            }
        }
    },
    firstErrorMessage: 'should match exactly one schema in oneOf'
}, {
    id: 'test repository_auth #8',
    config: {
        version: 1,
        repository_auth: {
            username_env: 'test',
            password_env: '',
            email_env: []
        },
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b'
            }
        }
    },
    firstErrorMessage: 'should match exactly one schema in oneOf'
}, {
    id: 'test repository_auth #9',
    config: {
        version: 1,
        repository_auth: {
            username_env: 'test',
            password_env: '',
            email_env: ''
        },
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b'
            }
        }
    },
    firstErrorMessage: 'should match exactly one schema in oneOf'
}, {
    id: 'test repository_auth #10',
    config: {
        version: 1,
        repository_auth: {
            username_env: 'test',
            password_env: '',
            email_env: 'x'
        },
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b'
            }
        }
    }
}, {
    id: 'test repository_auth #11',
    config: {
        version: 1,
        repository_auth: {
            token: { test: 'this' }
        },
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b'
            }
        }
    },
    firstErrorMessage: 'should match exactly one schema in oneOf'
}, {
    id: 'test repository_auth #12',
    config: {
        version: 1,
        repository_auth: {
            token: ''
        },
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b'
            }
        }
    },
    firstErrorMessage: 'should match exactly one schema in oneOf'
}, {
    id: 'test repository_auth #13',
    config: {
        version: 1,
        repository_auth: {
            token: 'x'
        },
        service_url: 'http://a.co',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b'
            }
        }
    }
}, {
    id: 'test ui #1',
    config: {
        version: 1,
        repository_auth: {
            token: 'x'
        },
        service_url: 'http://a.co',
        ui: null,
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b'
            }
        }
    },
    firstErrorMessage: 'should be object'
}, {
    id: 'test ui #2',
    config: {
        version: 1,
        repository_auth: {
            token: 'x'
        },
        service_url: 'http://a.co',
        ui: {},
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b'
            }
        }
    },
    firstErrorMessage: 'should have required property \'image\''
}, {
    id: 'test ui #3',
    config: {
        version: 1,
        repository_auth: {
            token: 'x'
        },
        service_url: 'http://a.co',
        ui: {
            image: 'a:b'
        },
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b'
            }
        }
    }
}, {
    id: 'test id #1',
    config: {
        version: 1,
        repository_auth: {
            token: 'x'
        },
        service_url: 'http://a.co',
        id: null,
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b'
            }
        }
    },
    firstErrorMessage: 'should be string'
}, {
    id: 'test id #2',
    config: {
        version: 1,
        repository_auth: {
            token: 'x'
        },
        service_url: 'http://a.co',
        id: '',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b'
            }
        }
    },
    firstErrorMessage: 'should NOT be shorter than 1 characters'
}, {
    id: 'test id #3',
    config: {
        version: 1,
        repository_auth: {
            token: 'x'
        },
        service_url: 'http://a.co',
        id: 'xyz',
        engine_pipeline: {
            sequence: [{
                test: {}
            }]
        },
        engines: {
            test: {
                image: 'a:b'
            }
        }
    }
}];
