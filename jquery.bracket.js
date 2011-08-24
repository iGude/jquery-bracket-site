function roundGap() {
  return parseInt($('.round:first').css('margin-right'))/2
}
function createTeamElement(round, name, score) {
  var tEl = $('<div class="team"><b>'+name+'</b><span>'+score[0]+'</span></div>');

  if (score) {
    if (score[0] > score[1])
      tEl.addClass('win')
    else if (score[0] < score[1])
      tEl.addClass('lose')
    else
      tEl.addClass('tie')
  }

  if (round == 0)
    return tEl;

  return tEl;
}

function connector(height, shift, teamContainer) {
  var width = roundGap()
  var drop = true;
  // drop:
  //  �\
  //    \_
  // !drop:
  //    /�
  //  _/
  if (height < 0) {
    drop = false;
    height = -height;
  }
  var src = $('<div class="connector"></div>').appendTo(teamContainer);
  src.css('height', height);
  src.css('width', width+'px');
  src.css('right', (-width-2)+'px');

  if (shift >= 0)
    src.css('top', shift+'px');
  else
    src.css('bottom', (-shift)+'px');
  
  if (drop)
    src.css('border-bottom', 'none');
  else
    src.css('border-top', 'none');

  var dst = $('<div class="connector"></div>').appendTo(src);
  dst.css('width', width+'px');
  dst.css('right', -width+'px');
  if (drop)
    dst.css('bottom', '0px');
  else
    dst.css('top', '0px');

  return src;
}

/* refactor with loser bracket */
function getTeamNames(results, round, match)
{
  var getTeamName = function(results, round, match, n) {
      var score = results[0][round-1][match*2+n];
      var mod = ':first';

      if (score[0] < score[1])
        mod = ':last';

      return $('#match-'+(round-1)+'-'+(match*2+n)+' .team'+mod+' b').text();
    }

  return [getTeamName(results, round, match, 0), getTeamName(results, round, match, 1)];
}

// used for mapping
function toText() { return $(this).text() }

var Round = function(bracket, index) {
  var matches = []
  return {
    addMatch: function(id, teams) {
        var el = $('<div class="match"></div>').appendTo(bracket);
        el.attr('id', id)
        if (teams) {
          var teamContainer = $('<div class="teamContainer"></div>')
          teamContainer.append(createTeamElement(index, teams[0].name, [teams[0].score, teams[1].score]))
          teamContainer.append(createTeamElement(index, teams[1].name, [teams[1].score, teams[0].score]))
          el.append(teamContainer)
        }
        matches.push(el)
        return el;
    }
  }
}

var Bracket = function(container)
{
  var rounds = []
  return {
    el: container,
    addRound: function() {
      var el = $('<div class="round"></div>').appendTo(container)
      rounds.push(el)
      return new Round(el, (rounds.length - 1))
    },
    getWinnerTeam: function() {
      var match = container.find('.match:last')
      var names = match.find('b').map(toText)
      var scores = match.find('span').map(toText)
      var winner = {name:null,score:0}

      if (scores[0] > scores[1]) {
        winner.score = scores[0]
        winner.name = names[0]
      }
      else {
        winner.score = scores[1]
        winner.name = names[1]
      }
      return winner
    }
  }
}

function render(data)
{
  var winners = $('#bracket')
  var losers = $('#loserBracket')
  var w = new Bracket(winners)
  var l = new Bracket(losers)
  renderWinners(w, losers, data);
  renderLosers(winners, l, data);
  renderFinals(w, l, data);

  postProcess($('#system'), data);
}

function postProcess(container, data)
{
  var Track = function(teamIndex, class) {
      var index = teamIndex;
      var elements = $('.team[index='+index+']')
      if (!class)
        var addedClass = 'highlight'
      else
        var addedClass = class

      return {
          highlight: function() {
              elements.each(function() {
                  $(this).addClass(addedClass)

                  if ($(this).hasClass('win'))
                    $(this).parent().find('.connector').addClass(addedClass)
                })
        },

        deHighlight: function() {
            elements.each(function() {
              $(this).removeClass(addedClass)
              $(this).parent().find('.connector').removeClass(addedClass)
            })
        }
      }
    }
  var m = {};

  for (var i = 0; i < data.teams.length; i++)
  {
    m[data.teams[i][0]] = i*2
    m[data.teams[i][1]] = i*2+1
  }

  container.find('div.team b').each(
      function() {
        var key = $(this).text()
        //$(this).parent().addClass('team-'+m[key]); 
        $(this).parent().attr('index', m[key]); 
      } 
    );

  var winTrack = new Track(6, 'highlightWinner');
  var loseTrack = new Track(15, 'highlightLoser');
  winTrack.highlight()
  loseTrack.highlight()

  $('.team').mouseover(function() {
      var i = $(this).attr('index') 
      winTrack.deHighlight()
      loseTrack.deHighlight()
      track = new Track(i);
      track.highlight()
      $(this).mouseout(function() {
          track.deHighlight()
          winTrack.highlight()
          loseTrack.highlight()
          $(this).unbind('mouseout')
        })
    })
}

function renderWinners(winners, losers, data)
{
  var teams = data.teams;
  var results = data.results;
  var rounds = Math.log(teams.length*2) / Math.log(2);
  var matches = teams.length;
  var graphHeight = winners.el.height();

  for (var r = 0; r < rounds; r++) {
    var round = winners.addRound()

    for (var m = 0; m < matches; m++) {
      var score = results[0][r][m];

      var team;
      if (r == 0)
        team = teams[m];
      else
        team = getTeamNames(results, r, m);
    
      var match = round.addMatch("match-"+r+"-"+m, 
                                 [{name: team[0], score: score[0]}, 
                                  {name: team[1], score: score[1]}])

      /* todo: move to class */
      var elClassTeamContainer = match.find('.teamContainer')
      match.css('height', (graphHeight/matches)+'px');
      elClassTeamContainer.css('top', (match.height()/2-elClassTeamContainer.height()/2)+'px');

      if (r < (rounds-1)) {
        var height, shift

        var connectorOffset = elClassTeamContainer.height()/4
        var matchupOffset = match.height()/2

        if (m%2 == 0) { // dir == down
          if (score[0] > score[1]) {
            height = matchupOffset
            shift = connectorOffset
          }
          else {
            height = matchupOffset - connectorOffset*2
            shift = connectorOffset*3
          }
        }
        else { // dir == up
          if (score[0] > score[1]) {
            height = -matchupOffset + connectorOffset*2
            shift = -connectorOffset*3
          }
          else {
            height = -matchupOffset
            shift = -connectorOffset
          }
        }

        elClassTeamContainer.append(connector(height, shift, elClassTeamContainer));
      }
    }
    matches /= 2;
  }
}

/* refactor with loser bracket */
function getWinnerTeamNames(container, results, round, match, n)
{
  var getTeamName = function(results, round, match, n) {
      var score = results[1][round*2+1][match];
      var mod = ':first';

      if (score[0] < score[1])
        mod = ':last';

      return container.find('#match-'+(round)+'-'+(match)+'-1 .team'+mod+' b').text();
    }

  return [getTeamName(results, round-1, match*2, n), 
          getTeamName(results, round-1, match*2+1, n)];
}

function renderLosers(winners, losers, data)
{
  var teams = data.teams;
  var results = data.results;
  var rounds = Math.log(teams.length*2) / Math.log(2)-1;
  var matches = teams.length/2;
  var graphHeight = losers.el.height();

  for (var r = 0; r < rounds; r++) {
    for (var n = 0; n < 2; n++) {
      var round = losers.addRound()

      for (var m = 0; m < matches; m++) {
        var score = results[1][r*2+n][m];

        var elClassTeamContainer = $('<div class="teamContainer"></div>')
        var team;
        /* match inside losers bracket */
        if (n%2 == 0) {
          /* first round comes from winner bracket */
          if (r == 0) {
            var getLoser = function(results, r, m) {
              var team;
              if (results[0][r][m][0] < results[0][r][m][1])
                team = teams[m][0];
              else
                team = teams[m][1];
              return team;
            };
            team = [getLoser(results, 0, m*2), getLoser(results, 0, m*2+1)];
          }
          else {
            team = getWinnerTeamNames(losers.el, results, r, m, n);
          }
        }
        else { /* match with dropped */
          var getWinner = function(results, r, m) {
            var getTeamName = function(results, round, match) {
              var score = results[1][round*2][match];
              var mod = ':first';

              if (score[0] < score[1])
                mod = ':last';

              return losers.el.find('#match-'+(round)+'-'+(match)+'-0 .team'+mod+' b').text();
            }

            return getTeamName(results, r, m);
          };
          var getLoser = function(results, r, m) {
            var score = results[0][r][m];
            var mod = ':first';

            if (score[0] > score[1])
              mod = ':last';

            return winners.find('#match-'+(r)+'-'+(m)+' .team'+mod+' b').text();
          };
          team = [getWinner(results, r, m), getLoser(results, r+1, m)];
        }
      
        elClassTeamContainer.append(createTeamElement(r*2+n, team[0], score));
        /* no toConnector every second time as this comes from winners */
        elClassTeamContainer.append(createTeamElement((n%2 == 1)?0:(r*2+n), team[1], [score[1],score[0]]));

        var match = round.addMatch('match-'+r+'-'+m+'-'+n)
        match.css('height', (graphHeight/matches)+'px');
        elClassTeamContainer.appendTo(match);
        elClassTeamContainer.css('top', (match.height()/2-elClassTeamContainer.height()/2)+'px');

        var connectorOffset = elClassTeamContainer.height()/4
        var matchupOffset = match.height()/2

        if (r < rounds-1 || n < 1) {
          var height = 0;
          var shift = 0;

          // inside lower bracket 
          if (n%2 == 0) {
            if (score[0] > score[1])
              height = 0;
            else
              height = -connectorOffset*2;

            shift = connectorOffset
          }
          else { // from winner bracket 
            if (m%2 == 0) { // dir == down 
              if (score[0] > score[1]) {
                shift = connectorOffset
                height = matchupOffset
              }
              else {
                shift = connectorOffset*3
                height = matchupOffset - connectorOffset*2
              }
            }
            else { // dir == up
              if (score[0] > score[1]) {
                shift = -connectorOffset*3
                height = -matchupOffset + connectorOffset*2
              }
              else {
                shift = -connectorOffset
                height = -matchupOffset
              }
            }
          }
          elClassTeamContainer.append(connector(height, shift, elClassTeamContainer));
        }
      }
    }
    matches /= 2;
  }
}

function renderFinals(winners, losers, data)
{
  var elClassRound = $('<div class="round"></div>').appendTo('#finals')
  var elClassMatch = $('<div class="match"></div>').appendTo(elClassRound)
  var elClassTeamContainer = $('<div class="teamContainer"></div>');
  var height = winners.el.height()+losers.el.height()
  var finalScore = data.results[2][0]

  var winnerScore = function(array) {
    return array[array.length-1][0]
  }

  var finalists = [winners.getWinnerTeam(), losers.getWinnerTeam()]

  elClassMatch.css('height', (height)+'px');
  elClassTeamContainer.append(createTeamElement(3, finalists[0].name, finalScore));
  elClassTeamContainer.append(createTeamElement(3, finalists[1].name, [finalScore[1],finalScore[0]]));
  elClassTeamContainer.appendTo(elClassMatch);

  var shift = (winners.el.height()/2 + winners.el.height()+losers.el.height()/2)/2 - elClassTeamContainer.height()/2 
  elClassTeamContainer.css('top', (shift)+'px');

  var height = shift-winners.el.height()/2
  var shift = elClassTeamContainer.height()/4 

  var score = winnerScore(data.results[0])
  if (score[0] > score[1]) {
    height = height+shift*2
  }
  connector(height,  shift,  elClassTeamContainer).appendTo(winners.el.find('.teamContainer:last'))

  var score = winnerScore(data.results[1])
  if (score[0] > score[1]) {
    height = height-shift*2
  }
  connector(-height, -shift, elClassTeamContainer).appendTo(losers.el.find('.teamContainer:last'))
}
