use strict;
use warnings;
use lib 't/lib';
use Test::More tests => 3;
use Test::Exception;
use t::util;

my $util = t::util->new();
local $ENV{CATALYST_CONFIG} = $util->config_path;

{
  lives_ok { $util->test_env_setup()}  'test db created and populated';
  use_ok 'Catalyst::Test', 'npg_qc_viewer';
  use_ok 'npg_qc_viewer::View::TT';
}


