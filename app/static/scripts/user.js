$.fn.getpokemon = function () {
    let _qs = '?' + $.param(qs);
    let _container = $(this);

    $.ajax({
        url: '/api/' + $('#user-profile').data('username') + '/pokemon/get' + _qs,
        type: 'GET',
        success: function (response) {
            let _pokemon_list = JSON.parse(response)['pokemon'];
            $('#pokemon-wrapper').renderpokemon(_pokemon_list);
        },
        error: function (error) {
            console.log(error.status);
        }
    });
};

$.fn.renderpokemon = function (list) {
    function pokemonoptions(type, istype, isowned) {
        let icons = {
            'male': 'fa-mars',
            'female': 'fa-venus',
            'ungendered': 'fa-circle',
            'shiny': 'fa-star',
            'alolan': 'fa-umbrella-beach',
            'lucky': 'fa-dice'
        };

        if (istype && type === 'ungendered') {
            return `<a class="${type} opt ${isowned ? 'owned' : ''}" href="#" data-content="${type}"><i class="${isowned ? 'fas' : 'far'} ${icons[type]}"></i></a><span class="opt"></span>`;
        } else if (istype) {
            return `<a class="${type} opt ${isowned ? 'owned' : ''}" href="#" data-content="${type}"><i class="${isowned ? 'fas' : 'far'} ${icons[type]}"></i></a>`;
        } else {
            return `<span class="${type} opt ${isowned ? 'owned' : ''}" href="#" data-content="${type}"><i class="${isowned ? 'fas' : 'far'} ${icons[type]}"></i></span>`;
        }
    }

    const Item = ({name, dex, shiny, shinyowned, male, maleowned, female, femaleowned, ungendered, ungenderedowned, alolan, alolanowned, luckyowned, regional, legendary}) => `
        <div class="pokemon ${(shinyowned | maleowned | femaleowned | ungenderedowned | alolanowned | luckyowned) ? 'owned' : ''}"
                ${maleowned ? 'data-maleowned="True"' : ''}
                ${femaleowned ? 'data-femaleowned="True"' : ''}
                ${ungenderedowned ? 'data-ungenderedowned="True"' : ''}
                ${shinyowned ? 'data-shinyowned="True"' : ''}
                ${alolanowned ? 'data-alolanowned="True"' : ''}
                ${luckyowned ? 'data-luckyowned="True"' : ''}
                data-key="${name}"
                data-dex="${dex}">
                
                <div class="img" style="background-image: url(https://s3-eu-west-1.amazonaws.com/dex-static-img/${dex}.png)"></div>
                <div class="info">${name}</div>
                <div class="dex-num">#${dex.toString().padStart(3, '0')}</div>
                ${legendary ? '<div class="dex-special legendary"></div>' : ''}
                ${regional ? '<div class="dex-special regional"><i class="fas fa-globe-africa"></i></div>' : ''}
                <div class="pm-opt">
                    ${ungendered ? pokemonoptions('ungendered', ungendered, ungenderedowned) : pokemonoptions('male', male, maleowned) + pokemonoptions('female', female, femaleowned)}
                    ${pokemonoptions('shiny', shiny, shinyowned)}
                    ${pokemonoptions('alolan', alolan, alolanowned)}
                    ${pokemonoptions('lucky', 'True', luckyowned)}
                </div>
            </div>
    `;

    if (list.length > 0) {
        $(this).html(list.map(Item).join(''));
    } else {
        $(this).html('<p id="no-results">Unfortunatly there are no Pokemon match your criteria. Please select a different option from the choices above.</p>');
    }
}

$.fn.updatestate = function (statetype) {
    var _pokemon = $(this).parent().parent();

    _pokemon.data(statetype, !_pokemon.data(statetype));

    var _name = _pokemon.data('key');
    var _dex = _pokemon.data('dex');
    var _state = _pokemon.data(statetype);
    var _ownedstate = _pokemon.checkownedstate();

    var obj = {};
    obj['name'] = _name;
    obj['dex'] = _dex;
    obj[statetype] = _state;
    obj['owned'] = _ownedstate;

    console.log(_ownedstate);

    var data = {data: JSON.stringify(obj)};

    $.ajax({
        url: '/api/' + $('#user-profile').data('username') + '/pokemon/update',
        data: data,
        type: 'PUT',
        success: function (response) {
            $('#pokemon-list').getpokemon();
        },
        error: function (error) {
            console.log(error.status);
        }
    });
};

$.fn.checkownedstate = function () {
    if (
        this.data('shinyowned')
        || this.data('alolanowned')
        || this.data('regionalowned')
        || this.data('maleowned')
        || this.data('femaleowned')
        || this.data('ungenderedowned')
    ) {
        return true;
    } else {
        return false;
    }
};

$.fn.api.settings.api = {
    'search': '/api/users/get?q={query}'
};

let qs = {};

$(function () {
    $('#pokemon-list').getpokemon();
    $('.ui.search').search();
    $('.ui.dropdown').dropdown();

});

$('#pokemon-list').on('click', 'a.opt.shiny', function () {
    $(this).updatestate('shinyowned');
}).on('click', 'a.opt.alolan', function () {
    $(this).updatestate('alolanowned');
}).on('click', '.pokemon a.opt.regional', function () {
    $(this).updatestate('regionalowned');
}).on('click', 'a.opt.male', function () {
    $(this).updatestate('maleowned');
}).on('click', '.pokemon a.opt.female', function () {
    $(this).updatestate('femaleowned');
}).on('click', '.pokemon a.opt.ungendered', function () {
    $(this).updatestate('ungenderedowned');
}).on('click', '.pokemon a.opt.lucky', function () {
    $(this).updatestate('luckyowned');
});

$('#pokemon-filters').on('change', '#gen-select', function () {
    qs.gen = $('#gen-select').val();
    $('#pokemon-list').getpokemon();
}).on('change', '#cat-select', function () {
    qs.cat = $('#cat-select').val();
    $('#pokemon-list').getpokemon();
}).on('change', '#own-select', function () {
    qs.own = $('#own-select').val();
    $('#pokemon-list').getpokemon();
});